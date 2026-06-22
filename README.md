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
| UI | Shadcn/ui, Radix UI, Tailwind CSS v4 |
| Rich Text | TipTap 3 (Phase 4) |
| Images | Cloudinary via Next Cloudinary |
| Email | Resend |
| Rate Limiting | Upstash Redis |
| Validasi | Zod v4 + React Hook Form |
| Analytics | Vercel Analytics (Phase 8) |
| Sanitasi HTML | Isomorphic DOMPurify |

---

## Fitur

### Publik
- Homepage dengan seksi **Featured**, **Latest** (paginasi), dan **Trending** (7 hari terakhir)
- Detail artikel dengan pelacakan view per IP (dedup 24 jam)
- Halaman listing `/latest` dan `/category/[slug]` dengan paginasi
- Halaman penulis `/author/[username]`
- Pencarian + filter kategori / tag / rentang waktu (`/search`)
- Navigasi kategori dinamis (6 kategori teratas)
- Halaman Tentang dan Kontak

### Autentikasi & Otorisasi
- Login / Register dengan email & password
- Forgot password dengan token berbatas waktu 1 jam (email via Resend)
- Reset password dengan invalidasi token setelah dipakai
- Proteksi route berbasis peran: `USER`, `JOURNALIST`, `EDITOR`, `ADMIN`
- Re-validasi JWT ke DB setiap request (cek `isActive` + `passwordChangedAt`)

### Dashboard Pengguna
- Edit profil: nama, bio, link sosial media
- Upload avatar (PNG / JPEG / WebP, maks 5 MB, force square crop via Cloudinary)
- Ganti password

### Manajemen Konten *(Phase 4+)*
- Status artikel: `DRAFT` → `REVIEW` → `PUBLISHED` / `REJECTED` / `SCHEDULED`
- Artikel featured / non-featured (max 3, curation manual)
- Kategori dan tag
- Upload gambar ke Cloudinary
- Editor rich text TipTap (link, image)

### Performa & Infrastruktur
- Build dengan **Turbopack** (dev & production)
- Connection pooling Prisma PG adapter
- Rate limiting dengan Upstash (graceful skip jika env tidak ada)
- Optimasi gambar dengan `next/image`

---

## Struktur Proyek

```
newsportal/
├── prisma/
│   ├── migrations/          # Riwayat migrasi database
│   ├── schema.prisma        # Definisi skema database
│   └── seed.ts              # Script seeding data contoh
├── public/
│   ├── placeholder-article.jpg       # Fallback gambar artikel (ArticleCard)
│   ├── placeholder-tech.svg          # Placeholder seed: Teknologi
│   ├── placeholder-biz.svg           # Placeholder seed: Bisnis
│   ├── placeholder-sport.svg         # Placeholder seed: Olahraga
│   ├── placeholder-ent.svg           # Placeholder seed: Hiburan
│   ├── placeholder-health.svg        # Placeholder seed: Kesehatan
│   └── placeholder-pol.svg           # Placeholder seed: Politik
├── src/
│   ├── actions/
│   │   ├── auth.ts          # Server Actions (logout, changePasswordAction)
│   │   └── profile.ts       # Server Actions (updateProfileAction)
│   ├── app/
│   │   ├── api/
│   │   │   ├── articles/route.ts              # GET: search + filter artikel
│   │   │   └── auth/
│   │   │       ├── [...nextauth]/route.ts     # NextAuth handler
│   │   │       ├── forgot-password/route.ts   # POST: kirim email reset
│   │   │       ├── register/route.ts          # POST: daftar akun baru
│   │   │       └── reset-password/route.ts    # POST: simpan password baru
│   │   ├── article/[slug]/
│   │   │   ├── ViewTracker.tsx               # Client component: track view
│   │   │   └── page.tsx                      # Detail artikel
│   │   ├── author/[username]/page.tsx         # Halaman penulis
│   │   ├── category/[slug]/page.tsx           # Listing per kategori
│   │   ├── forgot-password/
│   │   │   ├── forgot-password-form.tsx
│   │   │   └── page.tsx
│   │   ├── latest/page.tsx                    # Listing semua artikel
│   │   ├── login/
│   │   │   ├── login-form.tsx
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   ├── register-form.tsx
│   │   │   └── page.tsx
│   │   ├── reset-password/[token]/
│   │   │   ├── reset-password-form.tsx
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                    # Sidebar + auth guard
│   │   │   ├── page.tsx                      # Overview
│   │   │   ├── profile/page.tsx              # FR-UM-01
│   │   │   └── security/page.tsx             # FR-UM-02
│   │   ├── search/page.tsx                    # Pencarian + filter
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx                         # Root layout (Navbar, font, metadata)
│   │   └── page.tsx                           # Homepage
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Footer.tsx
│   │   │   ├── LogoutButton.tsx
│   │   │   ├── Navbar.tsx                     # Header sticky + navigasi kategori
│   │   │   └── Pagination.tsx                 # Paginasi dengan ellipsis
│   │   ├── news/
│   │   │   ├── ArticleCard.tsx                # HeroCard, HorizontalCard, SecondaryCard, NumberedCard
│   │   │   ├── FeaturedSection.tsx
│   │   │   ├── LatestSection.tsx
│   │   │   ├── SectionHeader.tsx
│   │   │   └── TrendingSection.tsx
│   │   ├── search/
│   │   │   ├── FilterPanel.tsx                # Filter kategori / tag / tanggal
│   │   │   ├── SearchClient.tsx               # Client: fetch + debounce + URL sync
│   │   │   └── SearchResults.tsx              # Hasil + skeleton loading
│   │   └── ui/
│   │   ├── dashboard/
│   │   │   ├── DashboardNav.tsx              # Sidebar nav role-aware (USER/JOURNALIST/EDITOR/ADMIN)
│   │   │   ├── ProfileForm.tsx               # Avatar + profile fields (Client Component)
│   │   │   └── ChangePasswordForm.tsx        # Change password form (Client Component)
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── sheet.tsx
│   │       └── upload-widget.tsx  # Themed wrapper CldUploadWidget
│   ├── generated/
│   │   └── prisma/                            # Prisma client (auto-generated)
│   ├── lib/
│   │   ├── actions/
│   │   │   └── view.ts                        # Server Action: pelacakan view artikel
│   │   ├── hooks/
│   │   │   └── use-debounce.ts                # Custom hook debounce
│   │   ├── articles.ts                        # Query artikel (featured, latest, trending, search)
│   │   ├── auth.config.ts                     # Config NextAuth edge-safe (middleware)
│   │   ├── auth.ts                            # NextAuth setup + re-validasi JWT ke DB
│   │   ├── authors.ts                         # Query penulis
│   │   ├── categories.ts                      # Query kategori
│   │   ├── db.ts                              # Prisma client singleton
│   │   ├── email.ts                           # Kirim email via Resend
│   │   ├── rate-limit.ts                      # Rate limiter Upstash (nullable)
│   │   ├── tags.ts                            # Query tag
│   │   └── utils.ts                           # Helper cn() untuk Tailwind
│   ├── schemas/
│   │   ├── auth.ts                            # Zod schemas: login, register, reset password
│   │   └── profile.ts                         # Zod schemas: profileSchema, changePasswordSchema
│   ├── types/
│   │   └── next-auth.d.ts                     # Augmentasi tipe NextAuth (id, role)
│   └── middleware.ts                           # Proteksi route via NextAuth
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
- Akun Cloudinary, Resend
- Akun Upstash Redis *(opsional — rate limiting di-skip jika env tidak ada)*

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

# Upstash Redis (opsional — rate limiting)
UPSTASH_REDIS_REST_URL="https://your-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Cloudinary (avatar upload Phase 3, cover image Phase 4)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"

# Email (Resend)
RESEND_API_KEY="re_your-api-key"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
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
- 8 tag: Breaking News, Eksklusif, Analisis, Opini, Investigasi, Infografis, Video, Podcast
- 11 artikel contoh (3 featured, 8 regular) — masing-masing dengan `coverImageUrl` dari SVG placeholder lokal per kategori (`/placeholder-{kategori}.svg` di `public/`)

Untuk testing semua role di development, jalankan juga:
```bash
npx tsx prisma/seed-test-accounts.ts
```
Membuat akun: `user@test.com`, `journalist@test.com`, `editor@test.com`, `admin@test.com` — semua dengan password `password123`.

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
| `db:seed-test` | `npx tsx prisma/seed-test-accounts.ts` | Buat akun test untuk semua role (dev only) |

---

## Arsitektur Komponen

### ArticleCard Variants

| Variant | Digunakan di | Deskripsi |
|---------|-------------|-----------|
| `HeroCard` | FeaturedSection | Kartu besar dengan gambar penuh, excerpt, info author |
| `SecondaryCard` | FeaturedSection | Kartu medium dengan gambar, kategori, timestamp |
| `HorizontalCard` | LatestSection, SearchResults | Kartu kompak horizontal dengan thumbnail kecil |
| `NumberedCard` | TrendingSection | Kartu ranking dengan nomor urut dan jumlah views |

### Query Artikel (`src/lib/articles.ts`)

| Fungsi | Keterangan |
|--------|------------|
| `getFeaturedArticles()` | 3 artikel published + isFeatured=true, urut publishedAt DESC |
| `getLatestArticles(page, perPage)` | Paginasi artikel published non-featured, default 6/halaman |
| `getAllPublishedArticles(page, perPage)` | Semua artikel published (termasuk featured), default 12/halaman |
| `getTrendingArticles()` | Top 5 artikel by views dalam 7 hari terakhir |
| `getArticleBySlug(slug)` | Detail artikel tunggal + tags (memoized dengan React `cache`) |
| `getRelatedArticles(categoryId, excludeSlug)` | 3 artikel terkait dalam kategori sama |
| `getArticlesByCategory(slug, page, perPage)` | Artikel per kategori, default 12/halaman |
| `getArticlesByAuthor(authorId, page, perPage)` | Artikel per penulis, default 12/halaman |
| `searchArticles(params)` | Full-text search + filter kategori / tag / tanggal |

---

## Proteksi Route

Diatur di `src/lib/auth.config.ts` via NextAuth `authorized` callback:

| Route | Akses |
|-------|-------|
| `/dashboard`, `/dashboard/profile`, `/dashboard/security`, `/dashboard/bookmarks`, `/dashboard/history` | Semua role yang sudah login |
| `/dashboard/*` lainnya | Login + role bukan USER (JOURNALIST/EDITOR/ADMIN) |
| `/login`, `/register` | Redirect ke `/` jika sudah login (dicek di page-level via `auth()`) |
| Semua route lain | Publik |

Middleware diterapkan ke semua route kecuali: `/api/*`, `/_next/*`, `/favicon.ico`, file PNG.

> Auth split-config pattern: `auth.config.ts` dipakai di middleware (edge runtime, tanpa DB query). `auth.ts` dipakai di server context dengan re-validasi JWT ke DB setiap request.
>
> **Penting:** Guard untuk auth pages (`/login`, `/register`) **tidak** ada di middleware karena middleware tidak bisa query DB — stale JWT cookie bisa menyebabkan false positive. Guard diimplementasi di page-level menggunakan `auth()` dari `auth.ts` yang DB-validated.

---

## Fonts

- **Heading:** Newsreader (Google Fonts, serif)
- **Body:** Roboto (Google Fonts, sans-serif)

---

## Status Implementasi

| Phase | Fitur | Status |
|-------|-------|--------|
| Phase 1 | Project Setup & Foundation | Selesai |
| Phase 2 | Public News Website | Selesai |
| Phase 3 | Authentication & User Features | Selesai |
| Phase 4 | CMS Dashboard | Sedang dikerjakan (Layout ✓, Article List/Create/Edit/Submit ✓) |
| Phase 5 | Editorial Workflow | Belum dimulai |
| Phase 6 | Analytics Dashboard | Belum dimulai |
| Phase 7 | SEO Optimization | Belum dimulai |
| Phase 8 | Production Ready | Belum dimulai |