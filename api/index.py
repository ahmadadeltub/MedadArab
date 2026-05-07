
import os, base64, io, math
from flask import Flask, render_template, request, jsonify, send_file
import numpy as np
import cv2

APP_NAME = "منصّة تحسين الخط العربي – النسخة الاحترافية"
app = Flask(__name__, static_folder="../static", template_folder="../templates")

# ---------------- Utility ----------------
def decode_base64_image(data_uri: str):
    if "," in data_uri:
        _, b64 = data_uri.split(",", 1)
    else:
        b64 = data_uri
    img_bytes = base64.b64decode(b64)
    arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img

def analyze_image(img):
    # Normalize & binarize
    h, w = img.shape[:2]
    scale = 768.0 / max(h, w) if max(h, w) > 768 else 1.0
    img_resized = cv2.resize(img, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3,3), 0)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Remove small specks
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT,(3,3))
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel, iterations=1)

    H, W = th.shape[:2]
    total = float(H*W) + 1e-6

    # Coverage (ink ratio)
    ink_pixels = int(np.count_nonzero(th))
    coverage = ink_pixels / total

    # Stroke width (mean distance transform * 2)
    dist = cv2.distanceTransform(th, cv2.DIST_L2, 3)
    mean_stroke = float(dist[th>0].mean()*2) if ink_pixels>0 else 0.0
    stroke_norm = mean_stroke / float(W)

    # Slant (median of near-vertical line angles)
    edges = cv2.Canny(th, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi/180.0, threshold=70)
    angles = []
    if lines is not None:
        for rho_theta in lines[:300]:
            rho, theta = rho_theta[0]
            ang = (theta - np.pi/2) * 180/np.pi
            if -60 <= ang <= 60:  # stem-ish
                angles.append(ang)
    skew_angle = float(np.median(angles)) if len(angles)>0 else 0.0

    # Baseline wobble (std of residuals for bottom-most ink per column)
    ys, xs = [], []
    for x in range(W):
        col = th[:, x]
        idx = np.where(col>0)[0]
        if idx.size>0:
            ys.append(idx.max())
            xs.append(x)
    baseline_wobble = 0.0
    if len(xs) > 12:
        X = np.vstack([np.array(xs), np.ones(len(xs))]).T
        y_arr = np.array(ys)
        coeff, _, _, _ = np.linalg.lstsq(X, y_arr, rcond=None)
        y_fit = X @ coeff
        residuals = y_arr - y_fit
        baseline_wobble = float(np.std(residuals))
    baseline_wobble_norm = baseline_wobble / float(H if H>0 else 1)

    # Smoothness via circularity of largest contour
    cnts, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    smoothness = 0.0
    if cnts:
        cnt = max(cnts, key=cv2.contourArea)
        area = cv2.contourArea(cnt)
        peri = cv2.arcLength(cnt, True)
        if area > 0 and peri > 0:
            smoothness = float(4*math.pi*area/(peri*peri))

    # Connected components (structure richness)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(th, connectivity=8)
    components = int(num_labels - 1)  # exclude background

    # Scoring (100) with soft ranges
    score = 100.0
    # slant
    score -= min(abs(skew_angle)/2.0, 20)       # up to -20
    # baseline
    score -= min((baseline_wobble_norm*100)*1.5, 20)  # up to -20
    # stroke width norm target ~ [0.015 .. 0.05]
    if stroke_norm < 0.012: score -= min((0.012-stroke_norm)*1200, 12)
    if stroke_norm > 0.06:  score -= min((stroke_norm-0.06)*800, 12)
    # coverage target ~ [0.03 .. 0.2]
    if coverage < 0.02: score -= min((0.02-coverage)*2000, 16)
    if coverage > 0.25: score -= min((coverage-0.25)*1600, 16)
    # smoothness (higher better)
    if smoothness < 0.25: score -= 10
    elif smoothness < 0.35: score -= 5

    score = max(0.0, min(100.0, score))

    # Suggestions
    suggestions = []
    if abs(skew_angle) > 8:
        suggestions.append("قلّل الميل: اجعل الأعمدة أقرب إلى العمودي (|الميل| ≤ 8°).")
    else:
        suggestions.append("ميل الحروف جيّد ومعتدل.")

    if baseline_wobble_norm > 0.03:
        suggestions.append("استقرّ على خط أساس ثابت: استخدم خطوطًا إرشادية واكتب ببطء محسوب.")
    else:
        suggestions.append("خط الأساس مستقرّ.")

    if stroke_norm < 0.012:
        suggestions.append("زد ضغط القلم قليلًا أو استخدم سنًّا أعرض لتحسين وضوح السكتات.")
    elif stroke_norm > 0.06:
        suggestions.append("خفّف ضغط القلم لتجنّب زيادة السُمك.")
    else:
        suggestions.append("سُمك السكتات ضمن النطاق الجيد.")

    if coverage < 0.02:
        suggestions.append("الحجم صغير جدًا؛ كبّر الحرف أو أبطئ لإضافة تفاصيل أوضح.")
    elif coverage > 0.25:
        suggestions.append("المساحة مملوءة أكثر من اللازم؛ حافظ على فواصل وفتحات الحروف.")
    else:
        suggestions.append("توازن المساحات جيد.")

    if smoothness < 0.3:
        suggestions.append("حواف مهتزة: جرّب حركة يد أبطأ ومنحنيات مستمرة.")
    else:
        suggestions.append("حواف الحروف ناعمة نسبيًا.")

    metrics = dict(
        coverage=round(coverage,4),
        mean_stroke_width_px=round(mean_stroke,2),
        stroke_width_norm=round(stroke_norm,4),
        skew_angle_deg=round(skew_angle,2),
        baseline_wobble_norm=round(baseline_wobble_norm,4),
        smoothness=round(smoothness,4),
        components=components,
        score=round(score,1)
    )
    return metrics, suggestions

# ---------------- Routes ----------------
@app.route("/")
def home():
    return render_template("index.html", app_name=APP_NAME)

@app.route("/practice")
def practice():
    return render_template("practice.html", app_name=APP_NAME)

@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    data = request.get_json(force=True)
    img_b64 = data.get("image","")
    if not img_b64:
        return jsonify({"error":"no image"}), 400
    img = decode_base64_image(img_b64)
    if img is None:
        return jsonify({"error":"decode failed"}), 400
    metrics, suggestions = analyze_image(img)
    return jsonify({"metrics": metrics, "suggestions": suggestions})

if __name__ == "__main__":
    import os
    PORT = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=PORT, debug=True)
