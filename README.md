# نظام إدارة حسابات الورش والدخل الشهري

تطبيق ويب Full Stack لإدارة ورش الألمنيوم: الورش، المصروفات، الرواتب، المدفوعات، والتقارير الشهرية — بديلاً عن ملفات Excel.

## التقنيات

| الطبقة | التقنية |
|--------|---------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + Recharts |
| Backend | Node.js + Express + TypeScript (**مشروع منفصل في `backend/`**) |
| Database | PostgreSQL + Prisma (ملفات المخطط داخل `backend/prisma/`) |
| Auth | JWT (access) + refresh cookie |
| Validation | Zod (`@workshop/shared` — نسخة للواجهة في `packages/shared`، ونسخة للباك اند داخل `backend/shared/`) |
| Docker | PostgreSQL عبر `docker-compose.yml` في الجذر |

## هيكل المشروع

```
workshop-accounts/
├── apps/
│   └── web/              # React SPA (RTL عربي)
├── backend/              # Express API + Prisma + shared مدمج (للرفع كمشروع وحده)
│   ├── shared/           # نسخة @workshop/shared للباك اند فقط
│   ├── prisma/
│   └── src/
├── packages/
│   └── shared/           # للواجهة وبناء الـ monorepo
├── docker-compose.yml
└── README.md
```

## التشغيل السريع (تطوير محلي)

### 1) المتطلبات

- Node.js 20+
- Docker Desktop (لـ PostgreSQL) أو PostgreSQL محلي

### 2) قاعدة البيانات

**الخيار أ — Docker:**

```bash
docker compose up -d
npm run db:deploy
npm run db:seed
```

**الخيار ب — PostgreSQL محلي (Windows):**

```powershell
npm run db:setup
```

### 3) التثبيت والبيئة

```bash
npm install
cp backend/.env.example backend/.env
# عدّل DATABASE_URL في backend/.env
npm run build -w @workshop/shared
npm run db:generate -w workshop-backend
```

### 4) التشغيل

```bash
npm run dev
```

- الواجهة: http://localhost:5173  
- API: http://localhost:4000  
- Health: http://localhost:4000/health  

**حساب افتراضي:** `admin` / `admin123` (من `backend/.env`)

## رفع الإنتاج

### Netlify (الواجهة فقط)

انظر **`docs/NETLIFY.md`** وملف **`netlify.toml`** في جذر المشروع. عيّن **`VITE_API_URL`** في لوحة Netlify لعنوان الـ API بعد رفعه.

### الواجهة (عام)

1. عند البناء عيّن عنوان الـ API:

   ```bash
   VITE_API_URL=https://api.yourdomain.com npm run build -w @workshop/web
   ```

2. ارفع محتوى `apps/web/dist` لاستضافة static (Netlify، Cloudflare Pages، nginx، إلخ).

### الباك اند (Node / Express)

1. ارفع مجلد **`backend/`** كاملاً (يشمل `backend/shared/`).
2. على السيرفر: `npm install` → `npm run build` → `npx prisma migrate deploy` → `npm run start`.
3. متغيرات البيئة: انظر `backend/.env.example` و`backend/README.md`.
4. **`CORS_ORIGIN`**: دومين الواجهة (يمكن عدة قيم مفصولة بفاصلة).

### Docker للباك اند

من داخل `backend/`:

```bash
docker build -t workshop-backend .
docker run --env-file .env -p 4000:4000 workshop-backend
```

## API (REST)

جميع المسارات تحت `/api/*` محمية بـ JWT ما عدا `/health` و`/api/auth/login` و`/api/auth/refresh`.

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/health` | فحص الخادم |
| POST | `/api/auth/login` | تسجيل دخول |
| POST | `/api/auth/refresh` | تجديد access token |
| POST | `/api/auth/logout` | خروج |
| GET | `/api/auth/me` | المستخدم الحالي |
| GET/POST | `/api/periods` | الفترات الشهرية |
| GET/POST/PUT/DELETE | `/api/workshops` | الورش + تصدير CSV |
| GET/POST | `/api/expenses` | المصروفات + فئات |
| GET/POST/PUT | `/api/employees` | الموظفون |
| GET/POST | `/api/salaries` | الرواتب |
| GET/POST | `/api/payments` | المدفوعات |
| GET | `/api/dashboard` | ملخص + أعلى متبقي |
| GET | `/api/dashboard/compare` | مقارنة شهرين |
| GET | `/api/dashboard/chart` | بيانات الرسم |
| GET | `/api/reports/financial-summary` | تقرير مالي للفترات |
| POST | `/api/import` | رفع Excel |

## استيراد Excel

ارفع ملف `.xlsx` بأوراق: Sheet1، Invoices، salary، Paid.

## المتغيرات البيئية

| الموقع | الوصف |
|--------|--------|
| `backend/.env` | `DATABASE_URL`, JWT، `PORT`, `CORS_ORIGIN`, بذرة الأدمن |
| `apps/web/.env` (اختياري) | `VITE_API_URL` للإنتاج، `VITE_DEV_API_URL` لتغيير البروكسي محلياً |

## ملاحظة

إذا بقي مجلد قديم `apps/api` عندك، احذفه يدوياً — المصدر الرسمي للـ API أصبح **`backend/`**.
