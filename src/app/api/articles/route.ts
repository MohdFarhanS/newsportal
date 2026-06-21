import { NextResponse } from "next/server"
import { subDays } from "date-fns"
import { searchArticles } from "@/lib/articles"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const search = searchParams.get("search") ?? ""
  const category = searchParams.get("category") ?? undefined
  const tag = searchParams.get("tag") ?? undefined
  const datePreset = searchParams.get("date") ?? ""
  const page = Math.max(1, Number(searchParams.get("page")) || 1)

  let dateFrom: Date | undefined
  if (datePreset === "7d") dateFrom = subDays(new Date(), 7)
  else if (datePreset === "30d") dateFrom = subDays(new Date(), 30)
  else if (datePreset === "90d") dateFrom = subDays(new Date(), 90)

  try {
    const { articles, total, totalPages } = await searchArticles({
      query: search,
      categorySlug: category || undefined,
      tagSlug: tag || undefined,
      dateFrom,
      page,
      perPage: 12,
    })

    return NextResponse.json({
      data: articles,
      meta: { total, page, totalPages, perPage: 12 },
    })
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
