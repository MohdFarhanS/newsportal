import "server-only"
import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"

type AnalyticsSummary = {
  totalArticles: number
  publishedArticles: number
  totalViews: number
}

export const getAnalyticsSummary = unstable_cache(
  async (): Promise<AnalyticsSummary> => {
    try {
      const rows = await db.article.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { viewCount: true },
      })

      const totalArticles = rows.reduce((sum, r) => sum + r._count._all, 0)
      const publishedArticles = rows.find((r) => r.status === "PUBLISHED")?._count._all ?? 0
      const totalViews = rows.reduce((sum, r) => sum + (r._sum.viewCount ?? 0), 0)

      return { totalArticles, publishedArticles, totalViews }
    } catch {
      return { totalArticles: 0, publishedArticles: 0, totalViews: 0 }
    }
  },
  ["analytics-summary"],
  { revalidate: 60, tags: ["analytics"] }
)
