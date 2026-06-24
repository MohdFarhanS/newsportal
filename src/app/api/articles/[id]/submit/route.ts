import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login terlebih dahulu." } },
      { status: 401 }
    )
  }

  const { role, id: userId } = session.user
  if (role !== "JOURNALIST" && role !== "EDITOR" && role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Akses ditolak." } },
      { status: 403 }
    )
  }

  const { id } = await params
  const article = await db.article.findFirst({
    where: { id, authorId: userId },
    select: { status: true, title: true, content: true, categoryId: true, excerpt: true },
  })
  if (!article) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Artikel tidak ditemukan." } },
      { status: 404 }
    )
  }
  if (article.status !== "DRAFT" && article.status !== "REJECTED") {
    return NextResponse.json(
      { error: { code: "INVALID_STATUS", message: "Status tidak valid untuk submit." } },
      { status: 400 }
    )
  }
  const hasContent = article.content.replace(/<[^>]*>/g, "").trim().length > 0
  if (!article.title || !hasContent || !article.categoryId || !article.excerpt) {
    return NextResponse.json(
      { error: { code: "INCOMPLETE", message: "Lengkapi semua field wajib sebelum submit." } },
      { status: 400 }
    )
  }

  const result = await db.article.updateMany({
    where: { id, authorId: userId, status: { in: ["DRAFT", "REJECTED"] } },
    data: { status: "REVIEW" },
  })
  if (result.count === 0) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Status artikel telah berubah. Muat ulang halaman." } },
      { status: 409 }
    )
  }

  return NextResponse.json({ message: "Artikel dikirim ke redaksi." })
}
