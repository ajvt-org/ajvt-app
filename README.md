# جمعية AJVT — منصة إدارة العضوية الرقمية

تطبيق ويب متكامل لإدارة عضوية جمعية **AJVT**، يشمل:
- نموذج انتساب للأعضاء مع رفع إثبات الدفع
- لوحة تحكم إدارية لمراجعة الطلبات وقبولها/رفضها
- توليد بطاقات عضوية رقمية مع QR Code

---

## المتطلبات الأساسية

| أداة | الإصدار الموصى |
|------|----------------|
| Node.js | v18+ |
| npm | v9+ |

---

## التثبيت والإعداد

### 1. استنساخ المشروع

```bash
git clone <repository-url>
cd app-ajvt
```

### 2. تثبيت التبعيات

```bash
npm install
```

### 3. إعداد ملف البيئة

أنشئ `.env` في جذر المشروع بالمحتوى التالي:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-key-change-in-production"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

> **مهم:** غيّر `JWT_SECRET` في بيئة الإنتاج.

### 4. إنشاء قاعدة البيانات

```bash
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

### 5. تشغيل التطبيق

```bash
npm run dev
```

افتح المتصفح على: http://localhost:3000

---

## بيانات الدخول للإدارة

| الحقل | القيمة |
|-------|--------|
| اسم المستخدم | `admin` |
| كلمة المرور | `admin123` |

> غيّر كلمة المرور فور الدخول الأول!

رابط الدخول: http://localhost:3000/admin/login

---

## هيكل المشروع

```
app-ajvt/
├── prisma/
│   ├── schema.prisma        # تعريف نموذج البيانات
│   ├── seed.ts              # سكريبت إنشاء حساب المشرف
│   └── migrations/
├── public/
│   └── uploads/             # صور إثبات الدفع
├── src/
│   ├── app/
│   │   ├── page.tsx                    # الصفحة الرئيسية + نموذج الانتساب
│   │   ├── member/[id]/page.tsx        # بطاقة العضوية الرقمية
│   │   ├── admin/login/page.tsx        # دخول الإدارة
│   │   ├── admin/dashboard/page.tsx    # لوحة التحكم
│   │   └── api/                        # API Routes
│   ├── components/
│   │   └── MemberCard.tsx              # بطاقة العضوية (QR + تحميل)
│   └── lib/
│       ├── prisma.ts                   # Prisma Client
│       ├── auth.ts                     # JWT + جلسات الإدارة
│       └── utils.ts                    # توليد رقم العضو
├── .env
├── prisma.config.ts
└── package.json
```

---

## المسارات

| المسار | الوصف |
|--------|-------|
| `/` | نموذج الانتساب |
| `/member/[id]` | بطاقة العضوية |
| `/admin/login` | دخول الإدارة |
| `/admin/dashboard` | لوحة التحكم |

---

## الأوامر

```bash
npm run dev          # تشغيل التطوير
npm run build        # بناء الإنتاج
npm run db:migrate   # تطبيق migrations
npm run db:seed      # بيانات أولية
npm run db:studio    # Prisma Studio
```

---

## Stack التقنية

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + واجهة عربية RTL
- **Prisma 7** + **SQLite** (better-sqlite3)
- **JWT** (jose) للمصادقة
- **qrcode** لتوليد رمز QR
- **html2canvas** لتحميل البطاقة كصورة
- **Tajawal / Amiri** للخطوط العربية
