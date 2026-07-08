# Migration Notes (Internal)

> Dokumen internal — bukan bagian dari README publik. Tujuan: kalau project ini dipakai ulang
> untuk klien asli dengan infrastruktur berbeda (bukan Vercel/Cloudinary/Neon/Upstash/Resend/
> Sentry free tier), ini daftar titik-titik konkret di codebase yang perlu disentuh, supaya
> tidak perlu menebak dari nol. Bukan rencana migrasi — cuma peta lokasi + fungsi.

## Vendor Lock-in — Vercel

| Lokasi | Fungsi sekarang | Kalau pindah platform |
|---|---|---|
| `src/lib/request-ip.ts` (`getClientIp`) | `process.env.VERCEL` truthy → percaya `x-vercel-forwarded-for` (header edge-injected Vercel, tidak bisa di-spoof client). Ini satu-satunya sumber IP yang dipakai untuk rate-limiting key dan view-dedup hash. | Ganti ke header yang disediakan platform baru (mis. `Fly-Client-IP` di Fly.io, `CF-Connecting-IP` di Cloudflare, atau trust proxy config Nginx/Node kalau self-host VPS). Kalau platform baru tidak punya edge yang mensanitasi header sama sekali (VPS polos di belakang reverse proxy sendiri), perlu pastikan proxy sendiri yang strip/overwrite header client-supplied — kalau tidak, seluruh rate-limiting bisa di-bypass via spoofed header. |
| `src/lib/rate-limit.ts` (`reportRateLimitInactive`) | `process.env.VERCEL_ENV !== "production"` — cuma kirim alert Sentry kalau env ini `"production"` (Vercel-specific value: `"production"` \| `"preview"` \| `"development"`). | Ganti ke variable environment platform baru, atau standarisasi ke `NODE_ENV`/custom var sendiri (mis. `APP_ENV=production`). |
| `vercel.json` (`crons`) | Vercel Cron memanggil `GET /api/cron/publish-scheduled` sesuai schedule (`0 0 * * *`, daily midnight — Hobby plan) untuk auto-publish artikel `SCHEDULED` yang sudah lewat waktunya. Auth via header `Authorization: Bearer ${CRON_SECRET}`, dicek di `src/app/api/cron/publish-scheduled/route.ts`. | Ganti ke scheduler platform baru: GitHub Actions `schedule` trigger + `curl`, cron job di VPS (`crontab` + `curl`/`wget`), Railway/Render cron job, atau queue-based scheduler (mis. Vercel Queues equivalent). Endpoint route handler-nya sendiri (`route.ts`) platform-agnostic — tinggal ganti siapa yang memanggilnya dan bagaimana `CRON_SECRET` di-set di platform baru. |
| `package.json` (`@vercel/analytics`, `@vercel/speed-insights`) + `src/app/layout.tsx` (`<Analytics />`, `<SpeedInsights />`) | Web analytics + Core Web Vitals tracking, keduanya Vercel SaaS product, request ke `va.vercel-scripts.com`/`vitals.vercel-insights.com`. | Ganti ke Plausible/Umami/PostHog/GA4, atau hapus kalau klien tidak butuh. Perlu update juga CSP `script-src`/`connect-src` di `next.config.ts` (domain `va.vercel-scripts.com` dan `vitals.vercel-insights.com` saat ini di-allowlist eksplisit). |
| `.env` / Vercel env vars (`NEXT_PUBLIC_APP_URL`) | Base URL untuk sitemap (`src/app/sitemap.ts`), robots (`src/app/robots.ts`), JSON-LD canonical/OG (`layout.tsx`, `article/[slug]`, `page.tsx`, `latest/`, `category/[slug]/`, `author/[username]/`), dan link reset password (`email.ts`). Tidak hardcode domain Vercel (`*.vercel.app`) di mana pun — variable ini generik, cuma **asumsi implisitnya** adalah domain custom yang sudah di-attach ke project Vercel (lihat insiden non-www di CLAUDE.md Phase 7). | Platform-agnostic sebenarnya — set ke domain final apa pun. Yang perlu diingat: kalau klien pakai preview URL platform baru (mis. `*.railway.app`) sebelum domain custom siap, var ini harus di-update manual per environment (tidak ada auto-detection seperti `VERCEL_URL`). |
| `next.config.ts` (`@sentry/nextjs` — `sourcemaps.disable: !!process.env.CI`) | Source map upload Sentry cuma jalan saat build **bukan** di CI (GitHub Actions) — asumsinya build production yang meng-upload source map terjadi di Vercel. | Kalau build production pindah ke CI/CD lain (GitHub Actions build+deploy, dsb.), logika `!!process.env.CI` ini perlu dibalik/disesuaikan — sekarang particular ke pattern "Vercel build vs GitHub Actions CI job" yang project ini pakai. |
| `.github/workflows/e2e.yml`, `ci.yml` | Bukan Vercel langsung, tapi CI mem-build project yang assume deployment target Vercel (`postinstall: prisma generate`, tidak ada `migrate deploy` otomatis ke production — lihat catatan Neon di bawah). | Kalau pindah CI/CD provider, workflow YAML perlu ditulis ulang untuk provider itu (GitLab CI, CircleCI, dll.) — logic dasarnya (lint→typecheck→build, dan E2E manual-dispatch) tetap portable secara konsep. |

**Catatan tambahan**: `package.json` `postinstall: "prisma generate"` — pattern ini spesifik untuk platform yang menjalankan `npm install` otomatis saat build (Vercel, Netlify, dll). Kalau self-host VPS dengan Docker, perlu pastikan step ini tetap dipanggil di Dockerfile/build script.

## Vendor Lock-in — Cloudinary

| Lokasi | Fungsi sekarang | Kalau pindah provider |
|---|---|---|
| `src/components/ui/upload-widget.tsx` (`CldUploadWidget` dari `next-cloudinary`) | Reusable wrapper widget upload (theme editorial baked-in). Dipakai di `ArticleForm.tsx` (cover image, `uploadPreset="newsportal_covers"`) dan `ProfileForm.tsx` (avatar, `uploadPreset="newsportal_avatars"`, `cropping:true` square). Upload terjadi client-side langsung ke Cloudinary lewat iframe widget (unsigned upload preset) — tidak lewat server aplikasi ini sama sekali. | Ganti ke Vercel Blob / S3 (presigned URL) / UploadThing / layanan CDN lain. Ini bukan swap kecil — arsitektur upload client-direct-to-CDN via unsigned preset itu pattern spesifik Cloudinary; provider lain (S3 presigned URL, misalnya) butuh endpoint server sendiri untuk generate presigned URL dulu (server-side signing step yang saat ini tidak ada). |
| Upload preset `newsportal_covers` / `newsportal_avatars` (dibuat manual di Cloudinary dashboard, tidak ada di kode) | Unsigned upload preset. Sejak sesi 7 Juli 2026: **dua lapis validasi** — (1) preset-level `allowed_formats`/`max_file_size` di Cloudinary dashboard itu sendiri (server Cloudinary, bukan cuma widget JS — **wajib di-setup manual**, tidak ikut dari kode, lihat catatan "Setup Preset Baru" di bawah), (2) `src/lib/cloudinary-verify.ts` (`verifyUploadedImage`) re-verifikasi via Admin API (`cloudinary.api.resource`) sebelum URL disimpan ke DB — dipanggil dari `updateProfileAction` (avatar) dan `createArticleAction`/`updateArticleAction`/`saveDraftAction` (cover). Widget config (`clientAllowedFormats`, `maxImageFileSize` di `upload-widget.tsx`) masih ada sebagai UX layer (validasi instan tanpa round-trip network), tapi bukan lagi satu-satunya proteksi. Signed upload (server generate signature sebelum upload diizinkan) **belum diterapkan** — didiskusikan sebagai opsi (b), sengaja ditunda, jadi keputusan per-klien nanti kalau butuh hardening lebih jauh. | Provider baru perlu keputusan baru soal validasi upload (signed upload + server validation, atau moderation API) — bukan sekadar cari preset-equivalent. Kalau pindah ke akun Cloudinary klien baru (tetap pakai Cloudinary, cuma ganti akun), preset-level settings ini **tidak ikut pindah otomatis** — harus di-setup ulang manual, lihat catatan di bawah. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (env vars) | Cloud name dipakai widget (public, client-exposed by design) dan `next.config.ts` `remotePatterns`. **Update sesi 7 Juli 2026**: `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` sekarang **aktif dipakai** — `src/lib/cloudinary-verify.ts` men-`cloudinary.config()` dengan ketiganya dan memanggil Admin API (`cloudinary.api.resource`) untuk verifikasi server-side upload avatar/cover image (lihat baris di atas). Validitas kedua value ini di akun Cloudinary saat ini sudah dikonfirmasi via `cloudinary.api.ping()` (sesi yang sama) — bukan placeholder basi. | Semua 4 var ini hilang/diganti kalau pindah provider. |
| `next.config.ts` `images.remotePatterns` (`res.cloudinary.com`) + CSP `img-src`/`frame-src`/`script-src` (`upload-widget.cloudinary.com`) | `next/image` cuma boleh optimize gambar dari hostname yang di-whitelist; CSP izinkan iframe+script Cloudinary widget. | Ganti hostname di `remotePatterns` + CSP ke domain CDN baru (mis. bucket S3 custom domain, `*.public.blob.vercel-storage.com` untuk Vercel Blob, dll). |
| `src/components/news/ArticleCard.tsx` (`cloudinarySrc()`, di-export, dipakai juga di `article/[slug]/page.tsx`) | Transform URL string manual: sisipkan `/w_1200,f_auto,q_auto/` setelah `/upload/` di URL Cloudinary — ini Cloudinary-specific URL transformation syntax, bukan library call. | Provider lain (Vercel Blob, S3+CloudFront, Imgix, dll.) punya syntax transform URL sendiri (atau tidak ada sama sekali, tergantung fitur on-the-fly resize). Fungsi ini perlu ditulis ulang total, bukan cuma ganti hostname. |
| `public/og-default.jpg`, `public/logo.png`, `public/placeholder-article.jpg` | Asset statis lokal (bukan di Cloudinary) — dipakai sebagai fallback saat `coverImageUrl`/`avatarUrl` kosong. **Tidak terpengaruh** migrasi provider gambar upload. | Tidak perlu diganti. |

### Setup Preset Baru (WAJIB manual, tidak ikut dari kode/repo)

Kalau project ini dipakai lagi dengan akun Cloudinary yang berbeda (klien baru, atau akun
sendiri yang baru) — dua upload preset ini **harus dibuat ulang manual** di Cloudinary
dashboard (Settings → Upload → Upload presets), preset settings **tidak tersimpan di
kode/git sama sekali**:

- `newsportal_avatars` dan `newsportal_covers`, keduanya **Unsigned**.
- **Format allowed**: `png, jpg, jpeg, webp` — harus sinkron dengan `ALLOWED_IMAGE_FORMATS`
  di `src/lib/cloudinary-verify.ts` dan `clientAllowedFormats` di
  `src/components/ui/upload-widget.tsx`. Kalau salah satu diubah, dua tempat lain wajib
  diubah bareng — kalau tidak, preset-level dan Admin-API-level validation akan
  berbeda tanpa disadari.
- **Max file size**: `5000000` bytes (5MB) — harus sinkron dengan `MAX_IMAGE_BYTES` di
  `cloudinary-verify.ts` dan `maxImageFileSize` di `upload-widget.tsx`, alasan sama seperti
  di atas.
- Tanpa setup preset baru ini, upload akan gagal total (bukan cuma validasi longgar) —
  widget butuh preset yang benar-benar ada di akun Cloudinary tujuan.

## Environment Variables — Ringkasan Lengkap

| Variable | Vendor | Wajib/Opsional | Catatan migrasi |
|---|---|---|---|
| `DATABASE_URL` | Neon (Postgres, pooler URL) | Wajib | Ganti ke connection string provider Postgres baru (Railway, Supabase, RDS, VPS self-hosted). Format standar Postgres, tidak ada Neon-specific syntax di kode. |
| `DIRECT_URL` | Neon (Postgres, direct/non-pooler URL) | Wajib | Dipakai `prisma.config.ts` untuk `prisma migrate deploy`. Beberapa provider tidak punya pooler terpisah — bisa sama dengan `DATABASE_URL` kalau begitu. |
| `AUTH_SECRET` | Auth.js (generik, bukan vendor lock-in) | Wajib | Portable — cuma random secret untuk JWT signing. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | Wajib (selama pakai Cloudinary) | Lihat bagian Cloudinary di atas. |
| `CLOUDINARY_API_KEY` | Cloudinary | Wajib (selama pakai Cloudinary) | Server-side. Dipakai `src/lib/cloudinary-verify.ts` (Admin API `cloudinary.api.resource`) untuk re-verifikasi ukuran/format file upload avatar+cover setelah upload, sebelum URL disimpan ke DB — pemakaian aktif sejak sesi 7 Juli 2026 (sebelumnya reserved/tidak terpakai). |
| `CLOUDINARY_API_SECRET` | Cloudinary | Wajib (selama pakai Cloudinary) | Sama seperti di atas — dipakai bareng `CLOUDINARY_API_KEY` untuk autentikasi Admin API call di `cloudinary-verify.ts`. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary | Wajib (selama pakai Cloudinary) | Client-exposed (upload widget). |
| `RESEND_API_KEY` | Resend | Wajib | Ganti ke API key provider email baru (SendGrid, Postmark, SMTP+Nodemailer) — `src/lib/email.ts` perlu rewrite pemanggilan API-nya (bukan cuma ganti env var), karena pakai Resend SDK langsung. |
| `EMAIL_FROM` | Resend (tapi format generik "From" address) | Wajib | Portable — cuma alamat email pengirim. |
| `NEXT_PUBLIC_GA_ID` | Google Analytics (rencana) | **Tidak dipakai** | Ditemukan di `.env` tapi **tidak ada referensi ke variable ini maupun `@next/third-parties`/`GoogleAnalytics` di `src/`** — sepertinya env var + dependency sisa yang belum di-wire atau sudah tidak dipakai. Perlu dikonfirmasi: hapus kalau memang dead, atau lengkapi wiring kalau memang direncanakan dipakai. |
| `NEXT_PUBLIC_APP_URL` | Netral (asumsi domain custom di Vercel) | Wajib | Lihat bagian Vercel di atas. |
| `UPSTASH_REDIS_REST_URL` | Upstash | Opsional (fail-open kalau kosong — lihat `rate-limit.ts`) | Ganti ke Redis provider lain (Upstash REST API spesifik ke `@upstash/redis` SDK — provider Redis biasa/self-hosted butuh SDK `ioredis`/`redis` standar, bukan drop-in replacement). |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Opsional (sama seperti di atas) | Sama seperti di atas. |
| `ALLOW_TEST_SEED` | Netral (internal safety flag proyek sendiri) | Opsional (dev/CI only) | Portable, bukan vendor-specific. |
| `NEON_DEV_ENDPOINT_ID` | Neon | Opsional (dipakai guard `assertDevDatabase()` di seeder test, CI only) | Kalau pindah dari Neon, guard ini perlu logic baru untuk mendeteksi "ini benar dev DB, bukan production" (Neon expose ini via hostname endpoint ID; provider lain mungkin tidak punya konsep branch DB sama sekali). |
| `CRON_SECRET` | Netral (custom bearer token, dipakai bareng Vercel Cron) | Wajib (untuk endpoint cron) | Portable — tinggal pastikan scheduler baru (lihat bagian Vercel) mengirim header `Authorization: Bearer <value>` yang sama. |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | Opsional (error monitoring) | Ganti ke DSN project Sentry baru (kalau bikin org/project baru untuk klien), atau ganti seluruh integrasi ke error monitoring lain (butuh rewrite `src/instrumentation.ts`, `src/instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `global-error.tsx`, `error.tsx`, dan `withSentryConfig()` di `next.config.ts`). |
| `SENTRY_AUTH_TOKEN` *(tidak ada di `.env` lokal — hanya di Vercel Production env vars)* | Sentry | Opsional (source map upload saat build) | Sama seperti di atas; hanya dibutuhkan di environment yang benar-benar build+deploy production. |
| `RATE_LIMIT_KEY_PREFIX` *(tidak ada di `.env` lokal — hanya di-set di GitHub Actions `e2e.yml`)* | Upstash (namespacing, bukan Upstash-specific mechanism) | Opsional | Konsep umum (key prefix/namespace) — portable ke Redis provider lain. |

## Catatan Umum

Project ini dibangun sebagai portfolio di atas Vercel + Cloudinary + Neon + Upstash + Resend +
Sentry — semua di tier gratis/dev, dipilih karena cocok untuk skala portfolio dan setup cepat,
bukan karena dievaluasi sebagai pilihan terbaik untuk kebutuhan produksi skala besar. Beberapa
titik integrasinya (terutama Cloudinary upload widget dan strategi resolusi IP Vercel-specific)
cukup dalam tertanam di kode — bukan sekadar env var yang tinggal diganti, ada logic/arsitektur
yang perlu ditulis ulang.

Kalau project ini dipakai untuk klien asli nanti, migrasi/upgrade infrastruktur sebaiknya
dilakukan **setelah** kebutuhan klien spesifik diketahui (skala trafik, budget, preferensi
platform, kepatuhan data residency, dll.) — bukan diasumsikan atau dikerjakan lebih dulu tanpa
konteks itu. Dokumen ini hanya peta lokasi, bukan rekomendasi platform pengganti.
