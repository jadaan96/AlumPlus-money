# إعداد Netlify للواجهة (React)

الـ API (Express) **لا يُرفع على Netlify** — ارفعه على Render أو Railway أو VPS، ثم ضع عنوانه في المتغير أدناه.

## 1) متغيرات البيئة في Netlify

من الموقع: **Site settings → Environment variables → Build**

| الاسم | القيمة | ملاحظة |
|--------|--------|--------|
| `VITE_API_URL` | `https://api.yourdomain.com` | بدون `/` في النهاية؛ عنوان الـ API بعد رفعه |

بدون `VITE_API_URL`، البناء يُضمّن واجهة تتصل بنفس الدومين فقط (لن يعمل `/api` إلا إذا أعدت توجيهاً على Netlify نحو سيرفر آخر).

## 2) ربط المستودع

1. **Netlify → Add new site → Import an existing project**
2. اختر GitHub/GitLab والريبو.
3. إعدادات البناء تُقرأ من **`netlify.toml`** في جذر المشروع (لا تغيّر «مجلد الأساس» إلا إذا فهمت التأثير).

## 3) البناء الأول

بعد أول deploy، تأكد أن الـ API يعمل وأن `CORS_ORIGIN` في `.env` الخاص بالباك اند يتضمن دومين Netlify، مثلاً:

`https://your-site.netlify.app`

أو دومينك المخصص.

## 4) كوكي تسجيل الدخول

إذا الفرونت على `*.netlify.app` والـ API على دومين آخر، قد تحتاج لاحقاً ضبط كوكي الـ refresh (`SameSite` / نطاق). الأسهل: **دومين واحد** (مثلاً `app.example.com` للواجهة و `api.example.com` مع إعدادات كوكي مناسبة) أو **Reverse proxy** يوجّه `/api` لنفس الدومين.

## 5) محلياً مع Netlify CLI (اختياري)

```bash
npm i -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

يتطلب نفس المتغيرات محلياً أو في لوحة Netlify.
