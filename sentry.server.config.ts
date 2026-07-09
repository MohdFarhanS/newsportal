import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 1,

  debug: false,

  // Client menutup koneksi sebelum response selesai (tab ditutup, navigasi,
  // HMR reload) - bukan error aplikasi, bukan dev-only (bisa juga terjadi di production).
  ignoreErrors: ["aborted"],
})
