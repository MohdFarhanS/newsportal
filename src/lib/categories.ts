import { cache } from "react"
import { db } from "@/lib/db"

export async function getNavCategories() {
  return db.category.findMany({
    orderBy: { createdAt: "asc" },
    take: 6,
    select: { id: true, name: true, slug: true },
  })
}

export const getCategoryBySlug = cache(async (slug: string) => {
  return db.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true },
  })
})


export async function getAllCategories() {
  return db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  })
}

export async function getAllCategoriesWithCount() {
  return db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { articles: true } } },
  })
}
