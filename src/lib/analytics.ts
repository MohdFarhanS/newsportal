import "server-only"
import { unstable_cache } from "next/cache"
import { subDays } from "date-fns"
import { db } from "@/lib/db"

type AnalyticsSummary = {
  totalArticles: number
  publishedArticles: number
  totalViews: number
}

type TopArticle = {
  id: string
  slug: string
  title: string
  viewCount: number
  author: { name: string | null }
  category: { name: string }
}

export const getTopArticles = (range: "7d" | "30d" | "all") =>
  unstable_cache(
    async (): Promise<TopArticle[]> => {
      try {
        const now = new Date()
        const whereClause =
          range === "7d"
            ? { viewedAt: { gte: subDays(now, 7) } }
            : range === "30d"
            ? { viewedAt: { gte: subDays(now, 30) } }
            : {}

        // ponytail: overfetch so unpublished articles don't shrink result below 10
        const TOP_ARTICLES_OVERFETCH = 50
        const viewCounts = await db.articleView.groupBy({
          by: ["articleId"],
          _count: { id: true },
          where: whereClause,
          orderBy: [{ _count: { id: "desc" } }, { articleId: "asc" }],
          take: TOP_ARTICLES_OVERFETCH,
        })

        if (viewCounts.length === 0) return []

        const articleIds = viewCounts.map((v) => v.articleId)

        const articles = await db.article.findMany({
          where: { id: { in: articleIds }, status: "PUBLISHED" },
          select: {
            id: true,
            slug: true,
            title: true,
            author: { select: { name: true } },
            category: { select: { name: true } },
          },
        })

        const articleMap = new Map(articles.map((a) => [a.id, a]))

        return viewCounts
          .map((v) => {
            const article = articleMap.get(v.articleId)
            if (!article) return null
            return { ...article, viewCount: v._count.id }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .slice(0, 10)
      } catch {
        return []
      }
    },
    ["analytics-top-articles", range], // ponytail: explicit per-range key; Next.js may auto-include args but this is unambiguous
    { revalidate: 60, tags: ["analytics"] }
  )()

export const getAnalyticsSummary = unstable_cache(
  async (): Promise<AnalyticsSummary> => {
    try {
      // ponytail: parallel fetch; totalViews from article_views (same source as getTopArticles)
      const [rows, totalViews] = await Promise.all([
        db.article.groupBy({ by: ["status"], _count: { _all: true } }),
        db.articleView.count(),
      ])

      const totalArticles = rows.reduce((sum, r) => sum + r._count._all, 0)
      const publishedArticles = rows.find((r) => r.status === "PUBLISHED")?._count._all ?? 0

      return { totalArticles, publishedArticles, totalViews }
    } catch {
      return { totalArticles: 0, publishedArticles: 0, totalViews: 0 }
    }
  },
  ["analytics-summary"],
  { revalidate: 60, tags: ["analytics"] }
)
