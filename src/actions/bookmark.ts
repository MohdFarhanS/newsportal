"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"

export async function toggleBookmarkAction(
  articleId: string,
): Promise<{ error?: string; bookmarked?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Login terlebih dahulu untuk bookmark artikel" }
  if (!articleId) return { error: "Artikel tidak valid" }

  const userId = session.user.id

  try {
    await db.bookmark.create({ data: { userId, articleId } })
    revalidatePath("/dashboard/bookmarks")
    return { bookmarked: true }
  } catch (e) {
    // P2002 = unique constraint → sudah di-bookmark, toggle off
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      await db.bookmark.delete({ where: { userId_articleId: { userId, articleId } } })
      revalidatePath("/dashboard/bookmarks")
      return { bookmarked: false }
    }
    return { error: "Gagal menyimpan bookmark" }
  }
}
