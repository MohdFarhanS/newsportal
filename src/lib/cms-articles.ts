import { db } from "@/lib/db"

export async function getUserArticles(userId: string, page: number = 1, perPage: number = 12) {
  const [articles, total] = await Promise.all([
    db.article.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: true,
      },
    }),
    db.article.count({ where: { authorId: userId } }),
  ])

  return {
    articles,
    total,
    totalPages: Math.ceil(total / perPage),
  }
}

export async function getArticleForEdit(id: string, userId: string) {
  return db.article.findFirst({
    where: { id, authorId: userId },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      tags: {
        include: { tag: { select: { id: true, name: true, slug: true } } },
      },
    },
  })
}

export type ArticleForEdit = NonNullable<Awaited<ReturnType<typeof getArticleForEdit>>>
