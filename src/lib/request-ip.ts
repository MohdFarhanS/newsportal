export function getClientIp(headers: Headers): string {
  if (process.env.VERCEL) {
    // On Vercel, every request that reaches this function has already passed through Vercel's
    // edge network — x-vercel-forwarded-for is edge-injected there and cannot be set by the
    // client (Vercel overwrites/strips any client-supplied header with the same name before it
    // reaches origin, per vercel.com/docs/headers/request-headers).
    return headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  }
  // Non-Vercel (local dev, or any other host) — no edge network exists here to sanitize these
  // headers, so this branch is spoofable by design. This is the known, accepted gap for local
  // dev; it is not meant to provide real IP-spoofing resistance off-Vercel.
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}
