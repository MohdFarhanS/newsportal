import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ponytail: returns null if env vars missing — skip rate limiting in dev without Upstash
export function getRateLimiter() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "newsportal",
  })
}
