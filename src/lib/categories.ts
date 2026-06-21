import { db } from "@/lib/db"

export async function getNavCategories() {
  return db.category.findMany({
    orderBy: { createdAt: "asc" },
    take: 6,
    select: { id: true, name: true, slug: true },
  })
}

export async function getCategoryBySlug(slug: string) {
  return db.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true },
  })
}


export async function getAllCategories() {
  return db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  })
}
