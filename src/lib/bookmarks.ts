import { db } from "@/lib/db"

const bookmarkArticleInclude = {
  author: { select: { id: true, name: true } },
  category: true,
} as const

export async function getUserBookmarks(userId: string, page: number, perPage = 12) {
  const where = { userId }
  const [bookmarks, total] = await Promise.all([
    db.bookmark.findMany({
      where,
      include: { article: { include: bookmarkArticleInclude } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.bookmark.count({ where }),
  ])
  return { bookmarks, total, totalPages: Math.ceil(total / perPage) }
}

export async function isArticleBookmarked(userId: string, articleId: string) {
  const result = await db.bookmark.findUnique({
    where: { userId_articleId: { userId, articleId } },
    select: { id: true },
  })
  return !!result
}
