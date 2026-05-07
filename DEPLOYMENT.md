
# نشر الموقع على الإنترنت (خيارات سريعة)

## الخيار A: Render (سهل ومجاني بقدر محدود)
1) ارفع هذا المشروع إلى GitHub كمستودع جديد.
2) من لوحة Render أنشئ Web Service جديد → اربط المستودع.
3) **Build Command**: `pip install -r requirements.txt`
4) **Start Command**: `gunicorn app:app --workers=2 --threads=4 --timeout=60`
5) Render سيضبط متغير البيئة `PORT` تلقائياً ويمنحك رابط HTTPS.

## الخيار B: Railway
1) اربط حسابك بـ GitHub واختر المستودع.
2) Railway يكتشف Python تلقائيًا. إن احتاج:
   - Build: `pip install -r requirements.txt`
   - Start: `gunicorn app:app --workers=2 --threads=4 --timeout=60`
3) ستحصل على عنوان عام HTTPS.

## الخيار C: Google Cloud Run (حاوية)
1) نزّل Google Cloud SDK وسجّل الدخول.
2) ابْنِ صورة Docker محليًا:
   ```bash
   docker build -t arabic-handwriting-ai:latest .
   docker run -p 8080:8080 -e PORT=8080 arabic-handwriting-ai:latest
   ```
3) ادفعها إلى Artifact Registry/Container Registry، ثم أنشئ خدمة Cloud Run تسمح بالوصول العام.

## الخيار D: VPS (DigitalOcean/Hetzner)
- أنشئ خادم Ubuntu صغير، ثبّت Docker أو استخدم `gunicorn` + `nginx` + `certbot` لتمكين HTTPS وربط نطاقك.

> ملاحظات:
- تم تعديل `app.py` لدعم متغير البيئة `$PORT`.
- يوجد `Procfile` و`Dockerfile` لتسهيل النشر على معظم المنصات.
- لا حاجة لتغيير الكود؛ فقط ارفع إلى GitHub واتبع خطوات أي خيار أعلاه.
