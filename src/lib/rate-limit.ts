import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

function makeRateLimiter(tokens: number, window: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Ratelimit({
    redis: Redis.fromEnv(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    limiter: Ratelimit.slidingWindow(tokens, window as any),
    prefix: "newsportal",
  })
}

// ponytail: returns null if env vars missing — skip rate limiting in dev without Upstash
export const getRateLimiter = () => makeRateLimiter(5, "15 m")
export const getSearchRateLimiter = () => makeRateLimiter(30, "1 m")
