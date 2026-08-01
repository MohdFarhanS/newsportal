import { cache } from "react"
import { db } from "@/lib/db"
import { subDays } from "date-fns"
import { unstable_cache } from "next/cache"

const articleInclude = {
  author: { select: { id: true, name: true } },
  category: true,
} as const

/**
 * Wrap a DB-backed query so infra-level failures (Neon compute quota
 * exhausted, connection pool exhaustion, transient network errors, etc.)
 * degrade the section to `fallback` instead of throwing and crashing the
 * whole Server Component tree. Logs so Sentry/Vercel logs still capture it.
 */

async function safeQuery<T>(label: string, fallback: T, query: () => Promise<T>): Promise<T> {
  try {
    return await query()
  } catch (err) {
    console.error(`[articles:${label}] query failed, returning fallback:`, err)
    return fallback
  }
}

export const getFeaturedArticles = unstable_cache(
  async () => {
    return safeQuery("getFeaturedArticles", [], () =>
      db.article.findMany({
        where: { isFeatured: true, status: "PUBLISHED"},
        orderBy: { publishedAt: "desc" },
        take: 3,
        include: articleInclude,
      }),
    )
  },
  ["featured-articles"],
  { revalidate: 120, tags: ["articles"] },
)

export const getLatestArticles = unstable_cache(
  async (page: number, perPage = 6, includeFeatured = false) => {
    const where = {
      status: "PUBLISHED" as const, 
      ...(includeFeatured ? {} : { isFeatured: false }),
    }
    return safeQuery(
      "getLatestArticles",
      { articles: [], total: 0, totalPages: 0 },
      async () => {
        const [articles, total] = await Promise.all([
          db.article.findMany({
            where,
            orderBy: { publishedAt: "desc" },
            skip: (page - 1) * perPage,
            take: perPage,
            include: articleInclude,
          }),
          db.article.count({ where }),
        ])
        return { articles, total, totalPages: Math.ceil(total / perPage) }
      },
    )
  },
  ["latest-articles"],
  { revalidate: 120, tags: ["articles"] },
)

export const getTrendingArticles = unstable_cache(
  async () => {

    try {

      const sevenDaysAgo = subDays(new Date(), 7)
      const TRENDING_OVERFETCH = 15
      const viewCounts = await db.articleView.groupBy({
        by: ["articleId"],
        _count: { id: true },
        where: { viewedAt: { gte: sevenDaysAgo } },
        orderBy: [{ _count: { id: "desc" } }, { articleId: "asc" }],
        take: TRENDING_OVERFETCH,
      })

      if (viewCounts.length === 0) return []

      const articleIds = viewCounts.map((v) => v.articleId)
      const articles = await db.article.findMany({
        where: { id: { in: articleIds }, status: "PUBLISHED" },
        select: { id: true, slug: true, title: true },
      })

      const articleMap = new Map(articles.map((a) => [a.id, a]))

      return viewCounts
        .map((v) => {
          const article = articleMap.get(v.articleId)
          if (!article) return null
          return { ...article, viewCount: v._count.id }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 5)
    } catch {
      return []
    }
  },
  ["trending-articles"],
  { revalidate: 300, tags: ["trending"] },
)

export const getArticleBySlug = cache(async (slug: string) => {
  return db.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: { include: { profile: true } },
      category: true,
      tags: { include: { tag: true } },
    },
  })
})

export async function getRelatedArticles(
  categoryId: string,
  excludeSlug: string,
  limit = 3,
) {
  return safeQuery("getRelatedArticles", [], () =>
    db.article.findMany({
      where: {
        categoryId,
        slug: { not: excludeSlug },
        status: "PUBLISHED",
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: articleInclude,
    }),
  )
}


export async function getArticlesByCategory(
  categorySlug: string,
  page: number,
  perPage: number = 12,
) {
  const where = {
    status: "PUBLISHED" as const,
    category: { slug: categorySlug },
  }
  return safeQuery(
    "getArticlesByCategory",
    { articles: [], totalPages: 0 },
    async () => {
      const [articles, total] = await Promise.all([
        db.article.findMany({
          where,
          include: articleInclude,
          orderBy: { publishedAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        db.article.count({ where }),
      ])
      return { articles, totalPages: Math.ceil(total / perPage) }
    },
  )
}


export async function getArticlesByAuthor(authorId: string, page: number, perPage = 12) {
  const where = { status: "PUBLISHED" as const, authorId }
  return safeQuery(
    "getArticlesByAuthor",
    { articles: [], total: 0, totalPages: 0 },
    async () => {
      const [articles, total] = await Promise.all([
        db.article.findMany({
          where,
          include: articleInclude,
          orderBy: { publishedAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        db.article.count({ where }),
      ])
      return { articles, total, totalPages: Math.ceil(total / perPage) }
    },
  )
}
export type ArticleWithRelations = Awaited<ReturnType<typeof getFeaturedArticles>>[number]
export type TrendingArticle = Awaited<ReturnType<typeof getTrendingArticles>>[number]
export type ArticleDetail = NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>


export type SearchArticlesParams = {
  query?: string
  categorySlug?: string
  tagSlug?: string
  dateFrom?: Date
  page?: number
  perPage?: number
}

export async function searchArticles({
  query = "",
  categorySlug,
  tagSlug,
  dateFrom,
  page = 1,
  perPage = 12,
}: SearchArticlesParams) {
  const trimmed = query.trim()

  const where = {
    status: "PUBLISHED" as const,
    ...(trimmed && {
      OR: [
        { title: { contains: trimmed, mode: "insensitive" as const } },
        { excerpt: { contains: trimmed, mode: "insensitive" as const } },
      ],
    }),
    ...(categorySlug && { category: { slug: categorySlug } }),
    ...(tagSlug && { tags: { some: { tag: { slug: tagSlug } } } }),
    ...(dateFrom && { publishedAt: { gte: dateFrom } }),
  }

  const [articles, total] = await Promise.all([
    db.article.findMany({
      where,
      include: articleInclude,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.article.count({ where }),
  ])

  return { articles, total, totalPages: Math.ceil(total / perPage) }
}

