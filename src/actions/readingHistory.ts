"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function trackReadingHistoryAction(articleId: string) {
  const session = await auth()
  if (!session?.user?.id) return

  try {
    // Only track published articles — guards against direct POST with draft article ids
    const article = await db.article.findUnique({
      where: { id: articleId, status: "PUBLISHED" },
      select: { id: true },
    })
    if (!article) return

    await db.readingHistory.upsert({
      where: { userId_articleId: { userId: session.user.id, articleId } },
      update: { readAt: new Date() },
      create: { userId: session.user.id, articleId },
    })
  } catch {
    // non-critical
  }
}

export async function deleteReadingHistoryItemAction(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  // Single atomic query: ownership validated at DB level, no TOCTOU window
  await db.readingHistory.deleteMany({ where: { id, userId: session.user.id } })
  revalidatePath("/dashboard/history")
}

export async function clearReadingHistoryAction(): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    await db.readingHistory.deleteMany({ where: { userId: session.user.id } })
    revalidatePath("/dashboard/history")
    return {}
  } catch {
    return { error: "Gagal menghapus riwayat" }
  }
}
