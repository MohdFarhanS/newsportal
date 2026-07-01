import "server-only"
import { unstable_cache } from "next/cache"
import { subDays, subWeeks } from "date-fns"
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

export type WeeklyUsers = { week: string; count: number }

const WIB_MS = 7 * 60 * 60 * 1000

// UTC-explicit: getUTCDay() is timezone-invariant regardless of server locale.
// toWIB shifts the UTC timestamp so getUTCDay() reads the WIB day — no date-fns local-time methods.
function wibMonWeekKey(utcDate: Date): string {
  const wib = new Date(utcDate.getTime() + WIB_MS)
  const day = wib.getUTCDay()
  const daysBack = day === 0 ? 6 : day - 1
  const mon = new Date(wib.getTime() - daysBack * 86_400_000)
  mon.setUTCHours(0, 0, 0, 0)
  const y = mon.getUTCFullYear()
  const m = String(mon.getUTCMonth() + 1).padStart(2, "0")
  const d = String(mon.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export const getTopArticles = (range: "7d" | "30d" | "all") =>
  unstable_cache(
    async (): Promise<TopArticle[]> => {
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
    },
    ["analytics-top-articles", range],
    { revalidate: 60, tags: ["analytics"] }
  )()

export const getNewUsersPerWeek = unstable_cache(
  async (): Promise<WeeklyUsers[]> => {
    const WEEKS = 12
    const now = new Date()
    const since = subWeeks(now, WEEKS)

    const users = await db.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    })

    const buckets = new Map<string, number>()
    for (let i = WEEKS - 1; i >= 0; i--) {
      buckets.set(wibMonWeekKey(subWeeks(now, i)), 0)
    }

    for (const { createdAt } of users) {
      const key = wibMonWeekKey(createdAt)
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }

    return Array.from(buckets.entries()).map(([week, count]) => ({ week, count }))
  },
  ["analytics-new-users-per-week"],
  // ponytail: separate tag — registration busts only this cache, not article analytics
  { revalidate: 3600, tags: ["analytics-users"] }
)

export const getAnalyticsSummary = unstable_cache(
  async (): Promise<AnalyticsSummary> => {
    // ponytail: parallel fetch; totalViews from article_views (same source as getTopArticles)
    const [rows, totalViews] = await Promise.all([
      db.article.groupBy({ by: ["status"], _count: { _all: true } }),
      db.articleView.count(),
    ])

    const totalArticles = rows.reduce((sum, r) => sum + r._count._all, 0)
    const publishedArticles = rows.find((r) => r.status === "PUBLISHED")?._count._all ?? 0

    return { totalArticles, publishedArticles, totalViews }
  },
  ["analytics-summary"],
  { revalidate: 60, tags: ["analytics"] }
)
