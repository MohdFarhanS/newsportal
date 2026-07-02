import { NextRequest, NextResponse } from "next/server"
import { subDays } from "date-fns"
import { searchArticles } from "@/lib/articles"
import { getSearchRateLimiter } from "@/lib/rate-limit"
import { parsePage } from "@/lib/pagination"

export async function GET(request: NextRequest) {
  const rl = getSearchRateLimiter()
  if (rl) {
    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown"
    const { success } = await rl.limit(`search:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT", message: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." } },
        { status: 429 }
      )
    }
  }

  const { searchParams } = new URL(request.url)

  const search = searchParams.get("search") ?? ""
  const category = searchParams.get("category") ?? undefined
  const tag = searchParams.get("tag") ?? undefined
  const datePreset = searchParams.get("date") ?? ""
  const page = parsePage(searchParams.get("page") ?? undefined)

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
    return NextResponse.json(
      { error: { code: "SEARCH_ERROR", message: "Search failed. Please try again." } },
      { status: 500 }
    )
  }
}
