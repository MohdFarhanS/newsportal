"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="id">
      <body>
        <main
          style={{
            maxWidth: "56rem",
            margin: "0 auto",
            padding: "5rem 1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#09090B", marginBottom: "1rem" }}>
            Sedang Dalam Pemeliharaan
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#6B7280", marginBottom: "1.5rem" }}>
            Kami sedang mengalami gangguan teknis. Silakan coba lagi dalam beberapa saat.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              backgroundColor: "#18181B",
              color: "white",
              borderRadius: "0.25rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
        </main>
      </body>
    </html>
  )
}