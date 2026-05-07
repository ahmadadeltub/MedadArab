
# Arabic Handwriting AI – Pro (Flask + Tailwind + OpenCV)

واجهة احترافية لتدريب وتحليل الخط العربي:
- **لوحة تمرين** مع خطوط إرشادية قابلة للتفعيل، حرف/كلمة مرجعية بخاصية الشفافية، ممحاة، وحفظ الرسم كصورة.
- **تحليل فوري بالذكاء الاصطناعي** (OpenCV): الميل، ثبات خط الأساس، سُمك السكتات، كثافة الحبر، نعومة الحواف، عدد المكوّنات، و **درجة جودة** من 100.
- تصميم حديث باستخدام **Tailwind CSS**.

## التشغيل محليًا
```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
ثم افتح المتصفح على http://127.0.0.1:5000/

## ملاحظات
- يمكن لاحقًا استبدال قواعد الاقتراحات بنموذج تعلّم عميق مدرّب على بيانات خط عربي (AHCD / IFN-ENIT / KHATT).
- الخطوط العربية عبر Google Fonts (Amiri/Noto Naskh).

