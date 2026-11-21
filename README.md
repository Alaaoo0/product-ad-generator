# مولّد الإعلانات (Product Ad Generator)

برنامج ويب بسيط: ارفع صورة منتج + اكتب وصف الإعلان، ويولّد إعلاناً احترافياً بالذكاء الاصطناعي.

![فكرة المشروع](https://img.shields.io/badge/Node.js-%E2%89%A518-green) ![API](https://img.shields.io/badge/API-OpenAI--compatible-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## المزايا

- رفع صورة المنتج بالسحب والإفلات أو بالضغط
- برومبت حر لوصف الإعلان (الأسلوب، الألوان، النص، المنصة...)
- اختيار المقاس: مربع (إنستغرام)، أفقي، عمودي (ستوري)
- تحكم بالجودة (عالية / متوسطة / سريعة)
- تحميل الإعلان الناتج بصيغة PNG
- واجهة عربية RTL متجاوبة مع الجوال

## التقنيات

- **Backend:** Node.js + Express + Multer
- **AI:** أي API متوافق مع OpenAI (افتراضياً `gpt-image-1` الذي يدعم تعديل الصور بالصورة المرجعية)
- **Frontend:** HTML/CSS/JS خالص بدون أي إطار عمل

## التشغيل محلياً

```bash
# 1. انسخ المستودع
git clone https://github.com/USER/product-ad-generator.git
cd product-ad-generator

# 2. ثبّت الحزم
npm install

# 3. جهّز مفتاح API
cp .env.example .env
# عدّل ملف .env وضع OPENAI_API_KEY

# 4. شغّل السيرفر
npm start
```

ثم افتح: `http://localhost:3000`

## الإعداد (`env.`)

| المتغير | الوصف |
|---|---|
| `OPENAI_API_KEY` | مفتاح API (مطلوب) |
| `OPENAI_BASE_URL` | رابط API — افتراضياً `https://api.openai.com/v1`، ويمكن تغييره لأي مزوّد متوافق |
| `IMAGE_MODEL` | اسم موديل الصور — افتراضياً `gpt-image-1` |
| `PORT` | منفذ السيرفر — افتراضياً `3000` |

## البنية

```
product-ad-generator/
├── server.js          # السيرفر + نقطة الـ API
├── public/
│   ├── index.html     # الواجهة
│   ├── style.css      # التصميم
│   └── app.js         # منطق الواجهة
├── .env.example
├── .gitignore
└── package.json
```

## ملاحظات

- لا ترفع ملف `.env` أبداً على GitHub (مضمّن في `.gitignore`)
- توليد الصورة ممكن ياخد حتى دقيقة حسب جودة الصورة والضغط على الـ API

## الرخصة

MIT — استخدمه بحرية.
