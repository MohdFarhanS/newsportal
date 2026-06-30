# NewsPortal

Portfolio project — portal berita modern berbahasa Indonesia yang dibangun dengan Next.js 15, menampilkan artikel terkurasi, sistem manajemen konten berbasis peran, dan pelacakan artikel trending secara real-time.

> **Catatan:** Semua artikel, jurnalis, dan konten lainnya bersifat fiktif dan dibuat untuk keperluan demonstrasi kemampuan fullstack development.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 15.5 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | PostgreSQL + Prisma 7 (PG adapter) |
| Auth | NextAuth v5 (beta) — Credentials provider, JWT |
| UI | Shadcn/ui, Radix UI, Tailwind CSS v4 |
| Rich Text | TipTap 3 |
| Images | Cloudinary via Next Cloudinary |
| Email | Resend |
| Rate Limiting | Upstash Redis |
| Validasi | Zod v4 + React Hook Form |
| Data Fetching | TanStack Query v5 |
| Analytics | Vercel Analytics |
| Sanitasi HTML | sanitize-html (save-time + display-time, allowlist-based) |

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
- Reset password dengan invalidasi token setelah dipakai — token disimpan sebagai SHA-256 hash di DB
- Proteksi route berbasis peran: `USER`, `JOURNALIST`, `EDITOR`, `ADMIN`
- Re-validasi JWT ke DB setiap request (cek `isActive` + `passwordChangedAt`)
- Rate limiting pada login, register, forgot password, reset password, dan search (Upstash)
- Security headers global: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000`, `Content-Security-Policy` (strict di production, +`unsafe-eval` di dev untuk Turbopack)
- URL fields (avatar, social links, cover image) divalidasi wajib HTTPS

### Dashboard Pengguna
- Edit profil: nama, bio, link sosial media
- Upload avatar (PNG / JPEG / WebP, maks 5 MB, force square crop via Cloudinary)
- Ganti password
- **Bookmark artikel** — simpan/hapus bookmark dari halaman artikel (tanpa reload), lihat semua bookmark di `/dashboard/bookmarks` dengan paginasi
- **Riwayat baca** — artikel yang dibaca otomatis tercatat (hanya pengguna login, `upsert` readAt mencegah duplikasi), lihat di `/dashboard/history` urut terbaru, hapus per-item atau hapus semua sekaligus

### Manajemen Konten *(CMS Dashboard)*
- Status artikel: `DRAFT` → `REVIEW` → `PUBLISHED` / `REJECTED` / `SCHEDULED`
- Artikel featured / non-featured (max 3, curation manual)
- Kategori dan tag
- Upload gambar ke Cloudinary
- Editor rich text TipTap (link, image)

### Editorial Workflow
- **Submit for Review** — Jurnalis submit artikel DRAFT/REJECTED ke editor; field wajib divalidasi sebelum submit
- **Review Queue** (`/dashboard/review`) — Editor/Admin melihat semua artikel berstatus REVIEW dalam urutan FIFO; filter per kategori + paginasi
- **Approve** — Editor publish artikel dari antrian melalui dialog konfirmasi; `publishedAt` diset otomatis, public pages di-revalidate
- **Jadwalkan** — Editor atur waktu publikasi otomatis (harus di masa depan, lokal timezone); artikel masuk status `SCHEDULED` dan tidak muncul di halaman publik sampai waktu tercapai; **Vercel Cron** (setiap hari tengah malam via `vercel.json`) auto-publish SCHEDULED → PUBLISHED dan revalidate semua public pages
- **Reject** — Editor tolak dengan catatan wajib (maks 2000 karakter); catatan ditampilkan ke jurnalis di halaman edit
- TOCTOU guard via `updateMany` — jika dua editor mereview artikel yang sama secara bersamaan, yang kedua mendapat 409 Conflict
- **Admin Override** (`/dashboard/manage-articles`) — Admin bisa mengubah status artikel ke status apapun tanpa batasan alur editorial; `publishedAt` selalu di-clear saat demote dan diset ulang saat promote ke PUBLISHED; public pages di-revalidate otomatis
- **Toggle Featured** (`/dashboard/manage-articles`) — Editor/Admin menandai artikel PUBLISHED sebagai featured (★/☆); homepage menampilkan maks 3 artikel featured via `getFeaturedArticles({ take: 3 })`; revalidate homepage + artikel page otomatis; EDITOR hanya melihat Featured toggle, ADMIN melihat Featured toggle + Override

### SEO
- `robots.txt` dinamis — Allow `/`, Disallow `/dashboard/`, `/api/`, `/admin/`
- `sitemap.xml` dinamis — semua published articles + categories + static pages
- **Open Graph + Twitter Card** di semua halaman: homepage, artikel, listing (`/latest`, `/category/[slug]`, `/author/[username]`), search (noindex)
- **JSON-LD structured data**: `NewsArticle` + `BreadcrumbList` di artikel, `BreadcrumbList` di category pages, `Organization` + `WebSite` + `SearchAction` di root layout
- Custom 404 (`not-found.tsx`) — editorial style dengan internal links
- `public/llms.txt` — AI search readiness sesuai [llmstxt.org](https://llmstxt.org) spec

### Performa & Infrastruktur
- Build dengan **Turbopack** (dev & production)
- Connection pooling Prisma PG adapter
- Rate limiting dengan Upstash (graceful skip jika env tidak ada)
- Optimasi gambar dengan `next/image` + Cloudinary auto-format/quality (`f_auto,q_auto`)
- **Suspense streaming** di homepage — Featured, Latest, Trending load secara independen
- **`React.cache()`** pada `getCategoryBySlug`, `getAuthorById`, `getArticleBySlug` untuk dedup DB call antara `generateMetadata` dan page component
- `loading.tsx` (skeleton) dan `error.tsx` (error boundary) di root app; loading skeleton per-segment di `dashboard/`, `latest/`, `category/[slug]/`, `article/[slug]/`, `author/[username]/` — masing-masing di-shape sesuai layout halaman
- **Database indexes**: semua FK yang sering di-query punya index eksplisit (`authorId`, `tagId`, `articleId`), index komposit untuk query CMS dan author page, dedikasi index untuk dedup view tracking; `pg_trgm` extension + GIN trigram indexes pada `articles.title` + `articles.excerpt` untuk efisiensi `searchArticles` ILIKE

---

## Struktur Proyek

```
newsportal/
├── prisma/
│   ├── migrations/          # Riwayat migrasi database
│   ├── schema.prisma        # Definisi skema database
│   └── seed.ts              # Script seeding data contoh
├── public/
│   ├── llms.txt                      # AI search readiness (llmstxt.org format)
│   ├── placeholder-article.jpg       # Fallback gambar artikel (ArticleCard)
│   ├── placeholder-*.svg             # SVG placeholder lama (tidak dipakai seed, tetap ada sebagai fallback)
├── src/
│   ├── actions/
│   │   ├── article.ts          # Server Actions (createArticleAction, updateArticleAction, saveDraftAction, submitForReviewAction)
│   │   ├── auth.ts             # Server Actions (logout, changePasswordAction)
│   │   ├── bookmark.ts         # Server Actions (toggleBookmarkAction)
│   │   ├── profile.ts          # Server Actions (updateProfileAction)
│   │   └── readingHistory.ts   # Server Actions (trackReadingHistoryAction, deleteReadingHistoryItemAction, clearReadingHistoryAction)
│   ├── app/
│   │   ├── api/
│   │   │   ├── articles/route.ts              # GET: search + filter artikel
│   │   │   ├── articles/[id]/submit/route.ts  # PATCH: submit artikel ke review (JOURNALIST/EDITOR/ADMIN, own article)
│   │   │   ├── articles/[id]/review/route.ts  # PATCH: approve/reject/schedule artikel (EDITOR/ADMIN only)
│   │   │   ├── articles/[id]/override/route.ts # PATCH: override status ke nilai apapun (ADMIN only, FR-AM-09)
│   │   │   ├── cron/
│   │   │   │   └── publish-scheduled/route.ts # GET: auto-publish SCHEDULED→PUBLISHED (auth: CRON_SECRET)
│   │   │   └── auth/
│   │   │       ├── [...nextauth]/route.ts     # NextAuth handler
│   │   │       ├── forgot-password/route.ts   # POST: kirim email reset
│   │   │       ├── register/route.ts          # POST: daftar akun baru
│   │   │       └── reset-password/route.ts    # POST: simpan password baru
│   │   ├── article/[slug]/
│   │   │   ├── HistoryTracker.tsx            # Client component: catat riwayat baca (auth-gated)
│   │   │   ├── ViewTracker.tsx               # Client component: track view
│   │   │   ├── loading.tsx                   # Skeleton: category + title + author + cover + body lines
│   │   │   └── page.tsx                      # Detail artikel (+ bookmark button untuk user login)
│   │   ├── author/[username]/
│   │   │   ├── loading.tsx                   # Skeleton: avatar header + article list
│   │   │   └── page.tsx                      # Halaman penulis
│   │   ├── category/[slug]/
│   │   │   ├── loading.tsx                   # Skeleton: section header + article list
│   │   │   └── page.tsx                      # Listing per kategori
│   │   ├── forgot-password/
│   │   │   ├── forgot-password-form.tsx
│   │   │   └── page.tsx
│   │   ├── latest/
│   │   │   ├── loading.tsx                   # Skeleton: section header + article list
│   │   │   └── page.tsx                      # Listing semua artikel
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
│   │   │   ├── loading.tsx                   # Skeleton: konten area (sidebar tetap visible)
│   │   │   ├── page.tsx                      # Overview
│   │   │   ├── bookmarks/page.tsx            # Daftar bookmark user (FR-BM-03)
│   │   │   ├── history/
│   │   │   │   ├── ClearHistoryButton.tsx    # Client: hapus semua riwayat (useTransition + toast + aria-busy)
│   │   │   │   ├── DeleteHistoryItemButton.tsx  # Client: hapus satu item (useTransition + toast + aria-busy)
│   │   │   │   └── page.tsx                  # Daftar riwayat baca (FR-RH-01, FR-RH-02)
│   │   │   ├── profile/page.tsx              # FR-UM-01
│   │   │   ├── security/page.tsx             # FR-UM-02
│   │   │   ├── articles/
│   │   │   │   ├── page.tsx                  # Daftar artikel milik user
│   │   │   │   ├── new/page.tsx              # Tulis artikel baru (FR-AM-01)
│   │   │   │   └── [id]/edit/page.tsx        # Edit artikel (FR-AM-10)
│   │   │   ├── review/
│   │   │   │   ├── loading.tsx               # Skeleton: review queue list
│   │   │   │   ├── page.tsx                  # Antrian review (EDITOR/ADMIN, FR-AM-06)
│   │   │   │   └── [id]/
│   │   │   │       ├── loading.tsx           # Skeleton: review detail
│   │   │   │       ├── page.tsx              # Detail artikel untuk review (FR-AM-07)
│   │   │   │       └── ReviewActions.tsx     # Client: approve/jadwalkan/reject dengan Shadcn Dialog
│   │   │   └── manage-articles/
│   │   │       ├── page.tsx                  # Kelola semua artikel (ADMIN only, FR-AM-09)
│   │   │       └── OverrideActions.tsx       # Client: override status ke nilai apapun dengan Dialog
│   │   ├── search/page.tsx                    # Pencarian + filter
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── not-found.tsx                      # Custom 404 page (editorial style)
│   │   ├── loading.tsx                        # Root loading skeleton (Suspense fallback)
│   │   ├── error.tsx                          # Root error boundary (client component)
│   │   ├── robots.ts                          # robots.txt dinamis
│   │   ├── sitemap.ts                         # sitemap.xml dinamis (articles + categories + static)
│   │   ├── globals.css
│   │   ├── layout.tsx                         # Root layout (Navbar, font, metadata, JSON-LD)
│   │   └── page.tsx                           # Homepage (Suspense streaming)
│   ├── components/
│   │   ├── bookmark/
│   │   │   └── BookmarkButton.tsx            # Toggle bookmark (client component, useTransition + toast)
│   │   ├── dashboard/
│   │   │   ├── ArticleForm.tsx               # Form create/edit artikel (shared, dengan autosave)
│   │   │   ├── ChangePasswordForm.tsx        # Change password form
│   │   │   ├── DashboardNav.tsx              # Sidebar nav role-aware (USER/JOURNALIST/EDITOR/ADMIN)
│   │   │   ├── ProfileForm.tsx               # Avatar + profile fields
│   │   │   └── TiptapEditor.tsx              # Rich text editor wrapper (TipTap 3)
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
│   │   ├── providers/
│   │   │   └── QueryProvider.tsx              # TanStack Query QueryClientProvider wrapper
│   │   ├── search/
│   │   │   ├── FilterPanel.tsx                # Filter kategori / tag / tanggal
│   │   │   ├── SearchClient.tsx               # Client: useQuery + debounce + URL sync
│   │   │   └── SearchResults.tsx              # Hasil + skeleton loading
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── sheet.tsx
│   │       └── upload-widget.tsx              # Themed wrapper CldUploadWidget
│   ├── generated/
│   │   └── prisma/                            # Prisma client (auto-generated)
│   ├── lib/
│   │   ├── actions/
│   │   │   └── view.ts                        # Server Action: pelacakan view artikel
│   │   ├── hooks/
│   │   │   └── use-debounce.ts                # Custom hook debounce
│   │   ├── articles.ts                        # Query artikel (featured, latest, trending, search, related)
│   │   ├── auth.config.ts                     # Config NextAuth edge-safe (middleware)
│   │   ├── bookmarks.ts                       # Query bookmark: getUserBookmarks, isArticleBookmarked
│   │   ├── cms-articles.ts                    # Query CMS: getUserArticles, getArticleForEdit, getReviewQueue, getArticleForReview
│   │   ├── readingHistory.ts                  # Query riwayat baca: getUserReadingHistory
│   │   ├── auth.ts                            # NextAuth setup + re-validasi JWT ke DB
│   │   ├── authors.ts                         # Query penulis
│   │   ├── categories.ts                      # Query kategori
│   │   ├── db.ts                              # Prisma client singleton
│   │   ├── email.ts                           # Kirim email via Resend
│   │   ├── rate-limit.ts                      # Rate limiter Upstash: getRateLimiter (5/15m), getSearchRateLimiter (30/1m)
│   │   ├── sanitize.ts                        # Shared sanitize-html options (allowlist: defaults + img)
│   │   ├── tags.ts                            # Query tag
│   │   └── utils.ts                           # Helper cn() untuk Tailwind
│   ├── schemas/
│   │   ├── article.ts                         # Zod schemas: articleSchema, saveDraftSchema
│   │   ├── auth.ts                            # Zod schemas: login, register, reset password
│   │   └── profile.ts                         # Zod schemas: profileSchema, changePasswordSchema
│   ├── types/
│   │   └── next-auth.d.ts                     # Augmentasi tipe NextAuth (id, role)
│   └── middleware.ts                           # Proteksi route via NextAuth
├── components.json          # Konfigurasi Shadcn/ui
├── next.config.ts           # Konfigurasi Next.js (Cloudinary remote pattern, security headers)
├── prisma.config.ts         # Konfigurasi Prisma
├── tsconfig.json            # Konfigurasi TypeScript
└── vercel.json              # Vercel Cron jobs (publish-scheduled, hourly)
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
- Akun [Neon](https://neon.tech) — dua branch: `production` (prod) dan `dev` (local). Jangan pakai satu branch untuk keduanya.
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
# Database — Neon branch "dev" untuk local, branch "production" untuk Vercel
# DATABASE_URL  = pooler URL  (runtime Next.js)
# DIRECT_URL    = direct URL  (prisma migrate deploy)
DATABASE_URL="postgresql://neondb_owner:<password>@<dev-branch-pooler-host>/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:<password>@<dev-branch-direct-host>/neondb?sslmode=require&channel_binding=require"

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

# App URL — gunakan production URL saat deploy (https://yourdomain.com)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email sender (harus domain yang diverifikasi di Resend)
EMAIL_FROM="no-reply@mail.yourdomain.com"

# Vercel Cron — generate dengan: node -e "require('crypto').randomBytes(32).toString('hex')"
# Set nilai yang sama di Vercel Dashboard > Environment Variables
CRON_SECRET="your-random-hex-secret"
```

### 3. Setup Database

```bash
# Jalankan migrasi
npm run migrate

# (Opsional) Seed data contoh
npm run db:seed
```

Data seed mencakup:
- 1 akun journalist: `journalist@newsportal.com` / `password123`
- 6 kategori: Teknologi, Bisnis, Olahraga, Hiburan, Kesehatan, Politik
- 8 tag: Breaking News, Eksklusif, Analisis, Opini, Investigasi, Infografis, Video, Podcast
- 11 artikel contoh (3 featured, 8 regular) — masing-masing dengan `coverImageUrl` dari [picsum.photos](https://picsum.photos) (ID dikurasi per artikel)

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
| `migrate` | `prisma migrate deploy` | Apply semua pending migration ke database |
| `db:seed` | `npx tsx prisma/seed.ts` | Seed data contoh (artikel, kategori, tag) ke database |
| `db:seed:test` | `npx tsx prisma/seed-test-accounts.ts` | Buat 4 akun test (USER/JOURNALIST/EDITOR/ADMIN) — butuh `ALLOW_TEST_SEED=true` di `.env` |
| `db:seed:admin` | `npx tsx prisma/seed-admin.ts` | Buat/update akun admin dari env vars — aman untuk production |

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
| `getLatestArticles(page, perPage, includeFeatured?)` | Paginasi artikel published. `includeFeatured=false` (default) untuk homepage sidebar; `=true` untuk `/latest` |
| `getTrendingArticles()` | Top 5 artikel by views dalam 7 hari terakhir |
| `getArticleBySlug(slug)` | Detail artikel tunggal + tags (memoized dengan React `cache`) |
| `getRelatedArticles(categoryId, excludeSlug)` | 3 artikel terkait dalam kategori sama |
| `getArticlesByCategory(slug, page, perPage)` | Artikel per kategori, default 12/halaman |
| `getArticlesByAuthor(authorId, page, perPage)` | Artikel per penulis, default 12/halaman |
| `searchArticles(params)` | ILIKE search (didukung pg_trgm GIN index) + filter kategori / tag / tanggal |

### Query Bookmark (`src/lib/bookmarks.ts`)

| Fungsi | Keterangan |
|--------|------------|
| `getUserBookmarks(userId, page, perPage?)` | Semua bookmark milik user, urut createdAt DESC, default 12/halaman |
| `isArticleBookmarked(userId, articleId)` | Cek apakah artikel sudah di-bookmark user — single `findUnique` pada composite unique index |

### Query CMS (`src/lib/cms-articles.ts`)

| Fungsi | Keterangan |
|--------|------------|
| `getUserArticles(userId, page, perPage?)` | Semua artikel milik user, urut updatedAt DESC, default 12/halaman |
| `getArticleForEdit(id, userId)` | Artikel tunggal milik user untuk form edit (ownership check) |
| `getReviewQueue(page, perPage?, categorySlug?)` | Artikel berstatus REVIEW, urut updatedAt ASC (FIFO), opsional filter kategori |
| `getArticleForReview(id)` | Artikel tunggal berstatus REVIEW untuk halaman review detail; returns `null` jika bukan REVIEW |
| `getAllArticlesAdmin(page, perPage?)` | Semua artikel semua status semua penulis, urut updatedAt DESC, default 12/halaman — khusus halaman Kelola Artikel ADMIN |

### Query Reading History (`src/lib/readingHistory.ts`)

| Fungsi | Keterangan |
|--------|------------|
| `getUserReadingHistory(userId, page, perPage?)` | Semua riwayat baca milik user, urut readAt DESC, default 12/halaman; `upsert` di sisi action memastikan setiap artikel hanya muncul sekali |

---

## Proteksi Route

Diatur di `src/lib/auth.config.ts` via NextAuth `authorized` callback:

| Route | Akses |
|-------|-------|
| `/dashboard`, `/dashboard/profile`, `/dashboard/security`, `/dashboard/bookmarks`, `/dashboard/history` | Semua role yang sudah login |
| `/dashboard/manage-articles` | ADMIN only (page-level guard via `auth()`) |
| `/dashboard/*` lainnya | Login + role bukan USER (JOURNALIST/EDITOR/ADMIN) |
| `/login`, `/register` | Redirect ke `/` jika sudah login (dicek di page-level via `auth()`) |
| Semua route lain | Publik |

Middleware diterapkan ke semua route kecuali: `/api/*`, `/_next/*`, `/favicon.ico`, file PNG.

> Auth split-config pattern: `auth.config.ts` dipakai di middleware (edge runtime, tanpa DB query). `auth.ts` dipakai di server context dengan re-validasi JWT ke DB setiap request.
>
> **Penting:** Guard untuk auth pages (`/login`, `/register`) **tidak** ada di middleware karena middleware tidak bisa query DB — stale JWT cookie bisa menyebabkan false positive. Guard diimplementasi di page-level menggunakan `auth()` dari `auth.ts` yang DB-validated.
>
> **USER route matching** menggunakan **exact match** (bukan `startsWith`) agar `/dashboard/profile-evil` tidak lolos whitelist karena ada `/dashboard/profile` di daftar yang diizinkan.

---

## Fonts

- **Heading:** Newsreader (Google Fonts, serif) — weight `600` dan `700` saja (normal); variant lain tidak di-preload untuk hemat bandwidth
- **Body:** Roboto (Google Fonts, sans-serif) — weight `400`, `500`, `700`

---

## Status Implementasi

| Phase | Fitur | Status |
|-------|-------|--------|
| Phase 1 | Project Setup & Foundation | Selesai |
| Phase 2 | Public News Website | Selesai |
| Phase 3 | Authentication & User Features | Selesai |
| Phase 4 | CMS Dashboard | Selesai |
| Phase 5 | Editorial Workflow | Selesai |
| Phase 6 | Analytics Dashboard | Sebagian selesai (FR-AN-01 summary stats + FR-AN-02 Top 10 per periode selesai; FR-AN-03 new-user chart belum) |
| Phase 7 | SEO Optimization | Sebagian selesai (robots, sitemap, JSON-LD, OG, llms.txt) |
| Phase 8 | Production Ready | Sebagian selesai (security headers CSP+HSTS, Vercel Analytics, email error handling, migration, portfolio disclaimer di footer + /about) |