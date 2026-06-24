import { db } from "@/lib/db"

const historyArticleInclude = {
  author: { select: { id: true, name: true } },
  category: true,
} as const

export async function getUserReadingHistory(userId: string, page: number, perPage = 12) {
  const where = { userId }
  const [items, total] = await Promise.all([
    db.readingHistory.findMany({
      where,
      include: { article: { include: historyArticleInclude } },
      orderBy: { readAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.readingHistory.count({ where }),
  ])
  return { items, total, totalPages: Math.ceil(total / perPage) }
}
