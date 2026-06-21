import { db } from "@/lib/db"

export async function getAllTags() {
  return db.tag.findMany({
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true, slug: true },
  })
}
