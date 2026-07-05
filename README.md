# NewsPortal

[![CI](https://github.com/MohdFarhanS/newsportal/actions/workflows/ci.yml/badge.svg)](https://github.com/MohdFarhanS/newsportal/actions/workflows/ci.yml)

Portfolio project — portal berita modern berbahasa Indonesia yang dibangun dengan Next.js 15, menampilkan artikel terkurasi, sistem manajemen konten berbasis peran, dan pelacakan artikel trending secara real-time.

Dibangun untuk eksplorasi editorial workflow yang realistis — 4 role dengan alur draft-review-publish lengkap dan proteksi race-condition — dibanding sekadar CRUD blog satu-role yang umum di project belajar.

🔗 Live Demo: [newsportal.my.id](https://newsportal.my.id)

> **Catatan:** Semua artikel, jurnalis, dan konten lainnya bersifat fiktif dan dibuat untuk keperluan demonstrasi kemampuan fullstack development.

---

## Highlights

- **Full-stack production-grade** — Next.js 15 App Router, TypeScript strict, PostgreSQL (Prisma), NextAuth v5, deploy di Vercel
- **Editorial workflow lengkap** — 4 role (User/Journalist/Editor/Admin), alur draft → review → schedule → publish dengan proteksi race-condition
- **256 automated E2E test** (Playwright) — auth, RBAC, accessibility (WCAG 2.1 AA), security, semuanya passed
- **SEO-ready** — Lighthouse SEO 100/100, JSON-LD structured data, dynamic sitemap, llms.txt
- **Security-hardened** — rate limiting, sanitasi HTML dua layer, security headers, session re-validation

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
| Fonts | Newsreader (heading) + Roboto (body) — Google Fonts |
| E2E Testing | Playwright — 256 test lintas 11 area kritis |
| A11y Testing | `@axe-core/playwright` — WCAG 2.1 AA runtime scan |

---

## Fitur

### Publik
- Homepage dengan seksi **Featured**, **Latest** (paginasi), dan **Trending** (7 hari terakhir)
- Detail artikel dengan view tracking (dedup otomatis per IP)
- Listing artikel di `/latest` dan `/category/[slug]` dengan paginasi
- Halaman penulis `/author/[username]`
- Pencarian + filter kategori / tag / rentang waktu (`/search`)
- Navigasi kategori dinamis (6 kategori teratas)
- Halaman Tentang dan Kontak

### Autentikasi & Otorisasi
- Login / Register dengan email & password
- Forgot & reset password via link email berbatas waktu, sekali pakai
- Role-based access control: `USER`, `JOURNALIST`, `EDITOR`, `ADMIN`
- Sesi pengguna otomatis tercabut saat akun disuspend atau password diganti
- Rate limiting di endpoint sensitif (login, register, forgot/reset password, search)

### Dashboard Pengguna
- Edit profil: nama, bio, link sosial media
- Upload avatar (PNG / JPEG / WebP, maks 5 MB, auto-crop persegi)
- Ganti password
- Bookmark artikel — simpan/hapus dari halaman artikel, lihat semua di `/dashboard/bookmarks` dengan paginasi
- Riwayat baca — tercatat otomatis saat login, urut terbaru di `/dashboard/history`, hapus per-item atau sekaligus

### Manajemen Konten *(CMS Dashboard)*
- Status artikel: `DRAFT` → `REVIEW` → `PUBLISHED` / `REJECTED` / `SCHEDULED`
- Artikel featured (maks 3, kurasi manual)
- Kategori dan tag
- Upload cover image untuk artikel
- Editor rich text (link, gambar)

### Administrasi *(ADMIN only)*
- **Kelola Taksonomi** (`/dashboard/taxonomy`) — CRUD kategori & tag dalam satu halaman; penghapusan diblokir jika masih dipakai artikel
- **Kelola Pengguna** (`/dashboard/users`) — filter & ubah role, aktifkan/nonaktifkan akun; admin tidak dapat mengubah atau menonaktifkan akun sendiri

### Editorial Workflow
- **Submit for Review** — jurnalis ajukan artikel draft/rejected ke editor
- **Review Queue** (`/dashboard/review`) — editor/admin lihat semua artikel REVIEW (urutan FIFO), filter per kategori
- **Approve** — publish artikel langsung dari antrian
- **Jadwalkan** — atur waktu publikasi otomatis di masa depan
- **Reject** — tolak dengan catatan wajib, ditampilkan ke jurnalis
- **Admin Override** (`/dashboard/manage-articles`) — ubah status artikel apapun tanpa batasan alur editorial
- **Toggle Featured** — tandai artikel published sebagai featured (maks 3 tampil di homepage)

### Analytics Dashboard *(EDITOR & ADMIN)*
- Ringkasan statistik: total artikel, artikel published, total views
- Top 10 artikel per periode (7 hari / 30 hari / semua waktu)
- Grafik pertumbuhan pengguna baru per minggu *(ADMIN only)*

### SEO
- `robots.txt` dan `sitemap.xml` dinamis
- Open Graph + Twitter Card di semua halaman
- Structured data (JSON-LD) untuk artikel & organisasi
- Custom 404 page
- `llms.txt` untuk AI-crawler readiness

---

## Technical Highlights

### Security
- Password reset token: sekali pakai, expire 1 jam, disimpan sebagai SHA-256 hash
- Sesi JWT di-re-validasi ke DB tiap request (`isActive`, `passwordChangedAt`) — auto-revoke saat suspend/ganti password
- Rate limiting (Upstash Redis) di endpoint sensitif, graceful skip jika env kosong di dev
- Security headers lengkap: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Resolusi IP client tersentralisasi (`getClientIp`) — prioritas header edge-injected Vercel di production, mencegah bypass rate-limiter via spoofing `x-forwarded-for`
- Sanitasi HTML dua layer (save-time + display-time) via `sanitize-html`, allowlist-based

### Reliability & Data Integrity
- TOCTOU guard (atomic `updateMany`) pada aksi review artikel bersamaan — race condition menghasilkan 409 Conflict, bukan data korup
- Riwayat baca pakai DB `upsert` — mencegah duplikasi entri
- Guard hapus taksonomi: kategori diproteksi FK RESTRICT + guard aplikasi; tag diproteksi guard aplikasi murni (relasi cascade di level DB)
- View tracking dedup per IP dalam window 24 jam — mencegah view-count inflation

### Performance
- Suspense streaming di homepage — Featured/Latest/Trending termuat independen
- `React.cache()` dedup DB call antara `generateMetadata` dan page component
- Index database lengkap untuk semua FK yang sering di-query, plus `pg_trgm`/GIN trigram index untuk full-text search
- Optimasi gambar: `next/image` + Cloudinary auto-format/quality, AVIF/WebP, cache 24 jam
- Cache analytics (`unstable_cache` + `revalidateTag`) — 60 detik untuk statistik/top-artikel, 1 jam untuk grafik pengguna, invalidasi otomatis saat ada aksi terkait
- Grafik pengguna baru: pure-CSS chart tanpa library eksternal, bucket mingguan timezone-aware (WIB)
- On-demand ISR — approve/override/toggle-featured/cron-publish otomatis me-revalidate halaman publik terkait

### Infrastructure
- Turbopack untuk dev & production build
- Connection pooling via Prisma PostgreSQL adapter (Neon pooler)
- Vercel Cron untuk auto-publish artikel terjadwal

### SEO & Discoverability
- JSON-LD lengkap: `NewsArticle` (+ `publisher.logo`, `mainEntityOfPage`, `isAccessibleForFree`, `author.url`), `Organization` (+ `logo`), `WebSite` + `SearchAction`, `BreadcrumbList` — eligible untuk Rich Results/Top Stories
- `llms.txt` sesuai spec [llmstxt.org](https://llmstxt.org) untuk AI-crawler readiness

---

## Known Limitations

- Belum ada error monitoring/tracking (Sentry atau sejenisnya) — error di production saat ini hanya terlihat lewat Vercel logs, belum ada alerting otomatis
- CI pipeline saat ini mencakup lint, typecheck, dan build; E2E suite (256 test) dijalankan manual sebelum deploy — integrasi otomatis ke pipeline menjadi langkah pengembangan berikutnya
- Rate limiting (Upstash) di-skip secara graceful kalau env var kosong — aman untuk development, tapi berarti proteksi rate-limit tidak aktif kecuali env dikonfigurasi
- Validasi file upload (avatar/cover image) masih mengandalkan konfigurasi client-side Cloudinary widget, belum ada validasi ulang di endpoint aplikasi sendiri

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

# Cloudinary (upload avatar & cover image artikel)
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
| `dev` | `next dev --turbopack` | Jalankan development server dengan Turbopack |
| `build` | `next build --turbopack` | Build project untuk production |
| `start` | `next start` | Jalankan production server |
| `lint` | `eslint` | Jalankan linting kode |
| `typecheck` | `tsc --noEmit` | Jalankan type-check TypeScript tanpa emit output |
| `migrate` | `prisma migrate deploy` | Apply semua pending migration ke database |
| `db:seed` | `npx tsx prisma/seed.ts` | Seed data contoh (artikel, kategori, tag) ke database |
| `db:seed:test` | `npx tsx prisma/seed-test-accounts.ts` | Buat 4 akun test (USER/JOURNALIST/EDITOR/ADMIN) — butuh `ALLOW_TEST_SEED=true` di `.env` |
| `db:seed:admin` | `npx tsx prisma/seed-admin.ts` | Buat/update akun admin dari env vars — aman untuk production |
| `test:e2e` | `playwright test` | Jalankan seluruh E2E test suite — butuh `npm run dev` di port 3000 sudah berjalan |
| `test:e2e:ui` | `playwright test --ui` | Jalankan E2E test suite dengan Playwright UI mode (debugging) |
| `test:a11y` | `playwright test accessibility.spec.ts` | Test accessibility (axe-core) secara terisolasi |
| `test:responsive` | `playwright test responsiveness.spec.ts` | Test responsiveness (overflow/nav-toggle/column-hide/reflow) secara terisolasi |
| `test:search` | `playwright test search.spec.ts` | Test search & filtering secara terisolasi |
| `test:bookmark-history` | `playwright test bookmark-history.spec.ts` | Test bookmark & reading history secara terisolasi |
| `test:analytics` | `playwright test analytics.spec.ts` | Test analytics dashboard secara terisolasi |
| `test:security` | `playwright test security.spec.ts` | Test security (CSRF, rate-limit, XSS, headers) secara terisolasi |

---

## Proteksi Route

Diatur di `src/lib/auth.config.ts` via NextAuth `authorized` callback:

| Route | Akses |
|-------|-------|
| `/dashboard`, `/dashboard/profile`, `/dashboard/security`, `/dashboard/bookmarks`, `/dashboard/history` | Semua role yang sudah login |
| `/dashboard/manage-articles` | EDITOR & ADMIN (page-level guard via `auth()`) |
| `/dashboard/taxonomy`, `/dashboard/users` | ADMIN only (page-level guard via `auth()`) |
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

## E2E Testing

Playwright E2E suite (`e2e/`) — **256 test, semuanya passed**, mencakup 11 area kritis: Authentication, RBAC, Editorial Workflow, Taxonomy Management, User Management, Accessibility (axe-core, WCAG 2.1 AA), Responsiveness, Search & Filtering, Bookmark & Reading History, Analytics Dashboard, dan Security (CSRF, rate-limit, XSS, security headers). Cakupan sengaja dibatasi ke area berisiko tinggi, bukan menyeluruh ke seluruh aplikasi.

**Prasyarat:** `npm run dev` harus sudah berjalan di port 3000 sebelum menjalankan test (`playwright.config.ts` reuse existing server, tidak membuka dev server baru).

```bash
npm run test:e2e      # jalankan seluruh suite
npm run test:e2e:ui   # mode UI (debugging)
```

Detail lengkap per-suite (bug yang ditemukan, catatan rate-limit, teknik testing, known limitations) ada di [`docs/TESTING.md`](docs/TESTING.md).

---

## Documentation

| Dokumen | Isi |
|---------|-----|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Struktur proyek lengkap, skema database (relasi + enum), [diagram editorial workflow](docs/ARCHITECTURE.md#editorial-workflow), referensi fungsi query per modul |
| [`docs/TESTING.md`](docs/TESTING.md) | Detail E2E test suite per area — cakupan, bug ditemukan, catatan operasional |
