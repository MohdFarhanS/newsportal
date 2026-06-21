# NewsPortal

Portal berita modern berbahasa Indonesia yang dibangun dengan Next.js 15, menampilkan artikel terkurasi, sistem manajemen konten berbasis peran, dan pelacakan artikel trending secara real-time.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 15.5 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | PostgreSQL + Prisma 7 (PG adapter) |
| Auth | NextAuth v5 (beta) — Credentials provider, JWT |
| UI | Shadcn/ui (radix-nova), Radix UI, Tailwind CSS v4 |
| Rich Text | TipTap 3 |
| Images | Cloudinary via Next Cloudinary |
| Email | Resend |
| Caching / Rate Limiting | Upstash Redis |
| Data Fetching (client) | TanStack React Query v5 |
| Validasi | Zod v4 + React Hook Form |
| Analytics | Vercel Analytics, Google Analytics |
| Slug | Slugify |
| Sanitasi HTML | Isomorphic DOMPurify |

---

## Fitur

### Publik
- Homepage dengan seksi **Featured**, **Latest** (paginasi), dan **Trending** (7 hari terakhir)
- Navigasi kategori dinamis (6 kategori teratas)
- Pelacakan view artikel per IP
- Desain responsif (mobile-first)

### Autentikasi & Otorisasi
- Login / Register dengan email & password
- Forgot password dengan token berbatas waktu (email via Resend)
- Proteksi route berbasis peran: `USER`, `JOURNALIST`, `EDITOR`, `ADMIN`
- Dashboard hanya bisa diakses peran non-USER

### Manajemen Konten
- Status artikel: `DRAFT` → `REVIEW` → `PUBLISHED` / `REJECTED` / `SCHEDULED`
- Artikel featured / non-featured
- Kategori dan tag
- Upload gambar ke Cloudinary
- Editor rich text TipTap (link, image)

### Performa & Infrastruktur
- Build dengan **Turbopack** (dev & production)
- Connection pooling Prisma PG adapter
- Rate limiting dengan Upstash
- Optimasi gambar dengan `next/image` (Cloudinary remote pattern)

---

## Struktur Proyek

```
newsportal/
├── prisma/
│   ├── migrations/          # Riwayat migrasi database
│   ├── schema.prisma        # Definisi skema database
│   └── seed.ts              # Script seeding data contoh
├── public/
│   └── placeholder-article.jpg
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout (Navbar, font, metadata)
│   │   └── page.tsx         # Homepage (Featured + Latest + Trending)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx       # Header sticky + navigasi kategori
│   │   │   └── Pagination.tsx   # Komponen paginasi dengan ellipsis
│   │   ├── news/
│   │   │   ├── ArticleCard.tsx      # HeroCard, HorizontalCard, SecondaryCard, NumberedCard
│   │   │   ├── FeaturedSection.tsx  # Seksi artikel featured
│   │   │   ├── LatestSection.tsx    # Seksi artikel terbaru + paginasi
│   │   │   ├── SectionHeader.tsx    # Judul seksi dengan border merah
│   │   │   └── TrendingSection.tsx  # Top 5 artikel trending
│   │   └── ui/
│   │       └── button.tsx       # Shadcn Button component
│   ├── lib/
│   │   ├── articles.ts      # Query artikel (featured, latest, trending)
│   │   ├── auth.ts          # Setup NextAuth + Credentials provider
│   │   ├── auth.config.ts   # Callbacks JWT/session, proteksi route
│   │   ├── categories.ts    # Query kategori navigasi
│   │   ├── db.ts            # Prisma client singleton
│   │   └── utils.ts         # Helper cn() untuk Tailwind
│   ├── schemas/
│   │   └── auth.ts          # Zod schemas: login, register, reset password
│   ├── types/
│   │   └── next-auth.d.ts   # Augmentasi tipe NextAuth (id, role)
│   ├── actions/             # Server Actions (belum diisi)
│   ├── features/            # Feature modules (belum diisi)
│   ├── hooks/               # Custom React hooks (belum diisi)
│   ├── services/            # Service layer (belum diisi)
│   └── middleware.ts        # NextAuth middleware (proteksi semua route)
├── components.json          # Konfigurasi Shadcn/ui
├── next.config.ts           # Konfigurasi Next.js (Cloudinary remote pattern)
├── prisma.config.ts         # Konfigurasi Prisma
└── tsconfig.json            # Konfigurasi TypeScript
```

---

## Skema Database

### Relasi Antar Model

```
User ──────┬──── Profile (1:1)
           ├──── Article (1:many, sebagai author)
           ├──── Bookmark (1:many)
           ├──── ReadingHistory (1:many)
           └──── PasswordResetToken (1:many)

Category ──────── Article (1:many)

Tag ───────────── ArticleTag (join table)
Article ───────── ArticleTag (join table)

Article ────┬──── Bookmark (1:many)
            ├──── ReadingHistory (1:many)
            └──── ArticleView (1:many, tracking per IP)
```

### Enum

```prisma
enum Role          { USER, JOURNALIST, EDITOR, ADMIN }
enum ArticleStatus { DRAFT, REVIEW, PUBLISHED, REJECTED, SCHEDULED }
```

---

## Cara Memulai

### Prasyarat

- Node.js 18+
- PostgreSQL (lokal atau cloud)
- Akun Cloudinary, Upstash Redis, Resend

### 1. Clone & Install

```bash
git clone <repo-url>
cd newsportal
npm install
```

### 2. Environment Variables

Buat file `.env` di root project:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/newsportal"

# NextAuth
AUTH_SECRET="your-secret-key-min-32-chars"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (Resend)
RESEND_API_KEY="re_your-api-key"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Analytics (opsional)
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### 3. Setup Database

```bash
# Jalankan migrasi
npx prisma migrate deploy

# (Opsional) Seed data contoh
npm run db:seed
```

Data seed mencakup:
- 1 akun journalist: `journalist@newsportal.com` / `password123`
- 6 kategori: Teknologi, Bisnis, Olahraga, Hiburan, Kesehatan, Politik
- 11 artikel contoh (3 featured, 8 regular)

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Scripts

| Script | Perintah | Keterangan |
|--------|----------|------------|
| `dev` | `next dev --turbopack` | Development server dengan Turbopack |
| `build` | `next build --turbopack` | Production build |
| `start` | `next start` | Jalankan production server |
| `lint` | `eslint` | Linting kode |
| `db:seed` | `npx tsx prisma/seed.ts` | Seed data contoh ke database |

---

## Arsitektur Komponen

### ArticleCard Variants

| Variant | Digunakan di | Deskripsi |
|---------|-------------|-----------|
| `HeroCard` | FeaturedSection | Kartu besar dengan gambar penuh, excerpt, info author |
| `SecondaryCard` | FeaturedSection | Kartu medium dengan gambar, kategori, timestamp |
| `HorizontalCard` | LatestSection | Kartu kompak horizontal dengan thumbnail kecil |
| `NumberedCard` | TrendingSection | Kartu ranking dengan nomor urut dan jumlah views |

### Query Artikel (`src/lib/articles.ts`)

| Fungsi | Keterangan |
|--------|------------|
| `getFeaturedArticles()` | 3 artikel published + isFeatured=true, urut publishedAt DESC |
| `getLatestArticles(page, perPage)` | Paginasi artikel published, default 6/halaman |
| `getTrendingArticles()` | Top 5 artikel by views dalam 7 hari terakhir |

---

## Proteksi Route

Diatur di `src/lib/auth.config.ts` via NextAuth `authorized` callback:

| Route | Akses |
|-------|-------|
| `/dashboard/*` | Login + role bukan USER |
| `/login`, `/register`, `/forgot-password` | Redirect ke `/` jika sudah login |
| Semua route lain | Publik |

Middleware diterapkan ke semua route kecuali: `/api/*`, `/_next/*`, `/favicon.ico`, file PNG.

---

## Fonts

- **Heading:** Newsreader (Google Fonts, serif)
- **Body:** Roboto (Google Fonts, sans-serif)
- **Mono:** Geist Mono

---

## Migrasi Database

| Migrasi | Perubahan |
|---------|-----------|
| `20260620191108_init` | Skema awal: semua model |
| `20260620203640_add_featured_article` | Tambah field `isFeatured` ke Article |
| `20260620225438_drop_account_session_add_password_reset_token` | Hapus tabel OAuth (Account, Session), tambah PasswordResetToken |

---

## Deployment

Proyek ini siap deploy ke **Vercel**. Pastikan semua environment variables dikonfigurasi di dashboard Vercel.

Untuk database production, disarankan menggunakan layanan managed PostgreSQL seperti:
- [Neon](https://neon.tech)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

Setelah deploy, jalankan migrasi:

```bash
npx prisma migrate deploy
```
