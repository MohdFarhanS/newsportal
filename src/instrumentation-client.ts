import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 1,

  // Session Replay: hanya rekam replay untuk sesi yang error, tidak sampling sesi normal
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.replayIntegration({
      // Eksplisit (bukan andalkan default SDK) — proyek ini punya halaman auth
      // (login/register/forgot-password/reset-password) yang gak boleh bocor
      // lewat replay. maskAllText + maskAllInputs mask semua teks & value input;
      // type="password" selalu di-mask oleh rrweb terlepas dari config ini.
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  debug: false,

  // Browser extension noise (password managers, Grammarly, dll) - bukan error aplikasi
  ignoreErrors: [
    "Object Not Found Matching Id",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
  ],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
