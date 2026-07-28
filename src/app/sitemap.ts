import type { MetadataRoute } from "next"
import { db } from "@/lib/db"

/**
 * Wrap a DB-backed query so infra-level failures (Neon compute quota
 * exhausted, connection pool exhaustion, transient network errors, etc.)
 * degrade to `fallback` instead of throwing. Prevents `npm run build` from
 * failing entirely just because sitemap generation couldn't reach the DB —
 * build succeeds with a smaller (static-pages-only) sitemap instead.
 */
async function safeQuery<T>(label: string, fallback: T, query: () => Promise<T>): Promise<T> {
  try {
    return await query()
  } catch (err) {
    console.error(`[sitemap:${label}] query failed, returning fallback:`, err)
    return fallback
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const [articles, categories] = await Promise.all([
    safeQuery("articles", [], () =>
      db.article.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: "desc" },
      }),
    ),
    safeQuery("categories", [], () =>
      db.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
    ),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/latest`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ]

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/article/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/category/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }))

  return [...staticPages, ...articlePages, ...categoryPages]
}