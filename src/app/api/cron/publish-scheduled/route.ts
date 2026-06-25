import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "CRON_SECRET tidak dikonfigurasi." } },
      { status: 500 }
    )
  }
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
      { status: 401 }
    )
  }

  const now = new Date()
  const articles = await db.article.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: { id: true, slug: true },
  })

  if (articles.length === 0) {
    return NextResponse.json({ published: 0 })
  }

  const result = await db.article.updateMany({
    where: { id: { in: articles.map((a) => a.id) }, status: "SCHEDULED" },
    data: { status: "PUBLISHED", publishedAt: now },
  })

  revalidatePath("/")
  revalidatePath("/latest")
  revalidatePath("/category/[slug]", "page")
  revalidatePath("/dashboard/review")
  revalidatePath("/dashboard/articles")
  for (const article of articles) {
    revalidatePath(`/article/${article.slug}`)
  }

  return NextResponse.json({ published: result.count })
}
