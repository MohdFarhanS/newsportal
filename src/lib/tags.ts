import { db } from "@/lib/db"

/**
 * Wrap a DB-backed query so infra-level failures (Neon compute quota
 * exhausted, connection pool exhaustion, transient network errors, etc.)
 * degrade to `fallback` instead of throwing.
 */
async function safeQuery<T>(label: string, fallback: T, query: () => Promise<T>): Promise<T> {
  try {
    return await query()
  } catch (err) {
    console.error(`[tags:${label}] query failed, returning fallback:`, err)
    return fallback
  }
}

export async function getAllTags() {
  return safeQuery("getAllTags", [], () =>
    db.tag.findMany({
      orderBy: { name: "asc" },
      take: 20,
      select: { id: true, name: true, slug: true },
    }),
  )
}

export async function getAllTagsWithCount() {
  return db.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { articles: true } } },
  })
}