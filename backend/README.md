# Backend — حسابات الورش (Express + Prisma + PostgreSQL)

مشروع **مستقل** داخل الريبو: يحتوي الكود، **Prisma**، ونسخة محلية من الحزمة المشتركة `shared/` (للرفع على استضافة Node بدون باقي الـ monorepo إن رغبت).

## المتطلبات

- Node.js 20+
- PostgreSQL (محلي، Docker، أو مستضاف مثل Neon / Supabase)

## الإعداد

1. انسخ البيئة:

   ```bash
   cp .env.example .env
   ```

2. عدّل `DATABASE_URL` وأسرار JWT و`CORS_ORIGIN` (دومين الواجهة بعد الرفع).

3. من جذر الريبو (مع workspaces):

   ```bash
   npm install
   npm run build -w workshop-backend
   npm run db:deploy -w workshop-backend
   npm run db:seed -w workshop-backend
   ```

   أو من داخل مجلد `backend/`:

   ```bash
   npm install
   npm run build
   npx prisma migrate deploy
   npm run db:seed
   ```

## التشغيل

```bash
npm run dev    # تطوير
npm run start  # إنتاج بعد npm run build
```

## Docker

من داخل مجلد `backend/`:

```bash
docker build -t workshop-backend .
docker run --env-file .env -p 4000:4000 workshop-backend
```

يتطلب `DATABASE_URL` يصل لـ PostgreSQL من الحاوية (عنوان الشبكة أو خدمة سحابية).

## رفع منفصل عن الـ monorepo

1. انسخ المجلدين **`backend/`** و**`backend/shared/`** كاملين.
2. في `backend`: `npm install` ثم `npm run build`.
3. عيّن المتغيرات على الاستضافة وشغّل `npm run start` (أو Docker أعلاه).
4. على استضافة الواجهة عيّن `VITE_API_URL` ليشير لعنوان هذا الـ API.

## CORS

- متغير واحد: `CORS_ORIGIN=https://myapp.com`
- عدة دومينات: `CORS_ORIGIN=https://a.com,https://b.com`

خلف Reverse Proxy (Railway، Render، nginx) يمكن تعيين `TRUST_PROXY=1`.

## ملاحظة الكوكي

إذا كان الفرونت والباك اند على **دومينين مختلفين**، كوكي التحديث قد يحتاج إعدادات إضافية (`SameSite` / نطاق الدومين). الأسهل: **نفس الدومين** مع مسار `/api` يوجّه للباك اند، أو دومين فرعي واحد مع إعدادات كوكي مناسبة.
