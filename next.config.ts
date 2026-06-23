import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

// script-src allows unsafe-eval in dev (Turbopack HMR) but not in production
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://upload-widget.cloudinary.com"
  : "script-src 'self' 'unsafe-inline' https://upload-widget.cloudinary.com"

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://picsum.photos https://fastly.picsum.photos",
  "connect-src 'self' https://vitals.vercel-insights.com",
  "frame-src https://upload-widget.cloudinary.com",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ")

const nextConfig: NextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === "development",
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

export default nextConfig
