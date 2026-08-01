import { cache } from "react"
import { db } from "@/lib/db"
import { unstable_cache } from "next/cache"

/**
 * Wrap a DB-backed query so infra-level failures (Neon compute quota
 * exhausted, connection pool exhaustion, transient network errors, etc.)
 * degrade to `fallback` instead of throwing. Used for queries that run
 * outside a Suspense boundary (e.g. Navbar, part of root layout) where an
 * uncaught error would escalate to global-error.tsx instead of error.tsx.
 */
async function safeQuery<T>(label: string, fallback: T, query: () => Promise<T>): Promise<T> {
  try {
    return await query()
  } catch (err) {
    console.error(`[categories:${label}] query failed, returning fallback:`, err)
    return fallback
  }
}

export const getNavCategories = unstable_cache(
  async () => {
    return safeQuery("getNavCategories", [], () =>
      db.category.findMany({
        orderBy: { createdAt: "asc" },
        take: 6,
        select: { id: true, name: true, slug: true },
      }),
    )
  },
  ["nav-categories"],
  { revalidate: 300, tags: ["categories"] },
)

export const getCategoryBySlug = cache(async (slug: string) => {
  return db.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true },
  })
})


export async function getAllCategories() {
  return safeQuery("getAllCategories", [], () =>
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  )
}

export async function getAllCategoriesWithCount() {
  return db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { articles: true } } },
  })
}
