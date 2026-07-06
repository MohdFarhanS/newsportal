import * as Sentry from "@sentry/nextjs"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

function makeRateLimiter(tokens: number, window: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Ratelimit({
    redis: Redis.fromEnv(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    limiter: Ratelimit.slidingWindow(tokens, window as any),
    // Namespaces every Redis key this limiter writes — lets CI share the same Upstash
    // instance as production without counters colliding (set via RATE_LIMIT_KEY_PREFIX in CI only).
    prefix: process.env.RATE_LIMIT_KEY_PREFIX ?? "newsportal",
  })
}

// returns null if env vars missing — skip rate limiting in dev without Upstash
export const getRateLimiter = () => makeRateLimiter(5, "15 m")
// login gets its own limiter — 5/15m is too tight for dev switching accounts
export const getLoginRateLimiter = () => makeRateLimiter(20, "15 m")
export const getSearchRateLimiter = () => makeRateLimiter(30, "1 m")

// Module-level flag — throttles the Sentry alert to once per cold start instead of
// once per request, so a prolonged Upstash outage doesn't spam the issue with duplicates.
let inactiveAlertSent = false

function reportRateLimitInactive(reason: "missing_env" | "runtime_error", error?: unknown) {
  // Only alert in production — dev/preview intentionally run without Upstash configured
  // (or may hit transient preview issues) and shouldn't page anyone.
  if (process.env.VERCEL_ENV !== "production") return
  if (inactiveAlertSent) return
  inactiveAlertSent = true

  Sentry.captureMessage("Rate limiting inactive in production", {
    level: "warning",
    extra: {
      reason,
      error: error instanceof Error ? error.message : error,
    },
  })
}

/**
 * Wraps `Ratelimit.limit()` so every call site treats "no limiter configured" and
 * "limiter call failed" as the same condition: rate limiting isn't active, so the
 * request proceeds (fail-open) — unchanged from prior behavior. The only new
 * behavior is a one-time-per-cold-start Sentry alert when this happens in production.
 */
export async function safeRateLimit(
  rl: Ratelimit | null,
  key: string
): Promise<{ success: boolean }> {
  if (!rl) {
    reportRateLimitInactive("missing_env")
    return { success: true }
  }

  try {
    return await rl.limit(key)
  } catch (error) {
    reportRateLimitInactive("runtime_error", error)
    return { success: true }
  }
}
