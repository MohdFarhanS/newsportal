import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const isDev = process.env.NODE_ENV === "development"

// script-src allows unsafe-eval in dev (Turbopack HMR) but not in production
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://upload-widget.cloudinary.com https://va.vercel-scripts.com"
  : "script-src 'self' 'unsafe-inline' https://upload-widget.cloudinary.com https://va.vercel-scripts.com"

// Sentry ingest host derived from DSN (o4511686847954944.ingest.us.sentry.io) — error reporting + session replay
// both go through this same host on Sentry SaaS, no separate replay domain
const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://picsum.photos https://fastly.picsum.photos",
  "connect-src 'self' https://vitals.vercel-insights.com https://o4511686847954944.ingest.us.sentry.io",
  "frame-src https://upload-widget.cloudinary.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ")

const nextConfig: NextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    minimumCacheTTL: 86400,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: "personal-project-i2",
  project: "newsportal",

  // Reduce noise in CI build logs (Vercel prod build keeps default verbosity)
  silent: !!process.env.CI,

  // No SENTRY_AUTH_TOKEN in GitHub Actions CI on purpose — source maps only need
  // to reach Sentry from the Vercel production build, not from the CI build/lint/typecheck job.
  sourcemaps: {
    disable: !!process.env.CI,
  },

  telemetry: false,
})
