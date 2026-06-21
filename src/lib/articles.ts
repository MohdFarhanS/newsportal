import { cache } from "react"
import { db } from "@/lib/db"
import { subDays } from "date-fns"

const articleInclude = {
  author: { include: { profile: true } },
  category: true,
} as const

export async function getFeaturedArticles() {
  return db.article.findMany({
    where: { isFeatured: true, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 3,
    include: articleInclude,
  })
}

export async function getLatestArticles(page: number, perPage = 6) {
  const [articles, total] = await Promise.all([
    db.article.findMany({
      where: { status: "PUBLISHED", isFeatured: false },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: articleInclude,
    }),
    db.article.count({ where: { status: "PUBLISHED", isFeatured: false } }),
  ])

  return {
    articles,
    total,
    totalPages: Math.ceil(total / perPage),
  }
}

export async function getAllPublishedArticles(page: number = 1, perPage: number = 12) {
  const where = { status: "PUBLISHED" as const }
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

export async function getTrendingArticles() {
  const sevenDaysAgo = subDays(new Date(), 7)

  const viewCounts = await db.articleView.groupBy({
    by: ["articleId"],
    _count: { id: true },
    where: { viewedAt: { gte: sevenDaysAgo } },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  })

  if (viewCounts.length === 0) return []

  const articleIds = viewCounts.map((v) => v.articleId)

  const articles = await db.article.findMany({
    where: { id: { in: articleIds }, status: "PUBLISHED" },
    include: articleInclude,
  })

  return viewCounts
    .map((v) => {
      const article = articles.find((a) => a.id === v.articleId)
      if (!article) return null
      return { ...article, viewCount: v._count.id }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

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
  return db.article.findMany({
    where: {
      categoryId,
      slug: { not: excludeSlug },
      status: "PUBLISHED",
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: articleInclude,
  })
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
}


export async function getArticlesByAuthor(authorId: string, page: number, perPage = 12) {
  const where = { status: "PUBLISHED" as const, authorId }
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

