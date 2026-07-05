"use server"

import { createHash } from "crypto"
import { subHours } from "date-fns"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { getClientIp } from "@/lib/request-ip"

export async function trackArticleView(articleId: string) {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)

    const viewerHash = createHash("sha256").update(ip).digest("hex")
    const oneDayAgo = subHours(new Date(), 24)

    const existing = await db.articleView.findFirst({
      where: { articleId, viewerHash, viewedAt: { gte: oneDayAgo } },
      select: { id: true },
    })

    if (existing) return

    await db.$transaction([
      db.articleView.create({ data: { articleId, viewerHash } }),
      db.article.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      }),
    ])
  } catch {
    // View tracking is non-critical
  }
}
