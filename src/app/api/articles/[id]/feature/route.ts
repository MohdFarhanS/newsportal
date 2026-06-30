import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login terlebih dahulu." } },
      { status: 401 }
    )
  }

  if (session.user.role !== "EDITOR" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Akses ditolak." } },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Body tidak valid." } },
      { status: 400 }
    )
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Body tidak valid." } },
      { status: 400 }
    )
  }

  const { isFeatured } = body as { isFeatured: unknown }
  if (typeof isFeatured !== "boolean") {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "isFeatured harus berupa boolean." } },
      { status: 400 }
    )
  }

  const { id } = await params

  const article = await db.article.findUnique({
    where: { id },
    select: { status: true, slug: true },
  })

  if (!article) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Artikel tidak ditemukan." } },
      { status: 404 }
    )
  }

  if (article.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: { code: "NOT_PUBLISHED", message: "Hanya artikel berstatus Published yang dapat ditandai Featured." } },
      { status: 400 }
    )
  }

  await db.article.update({
    where: { id },
    data: { isFeatured },
  })

  revalidatePath("/")
  revalidatePath(`/article/${article.slug}`)
  revalidatePath("/dashboard/manage-articles")

  const message = isFeatured
    ? "Artikel ditandai sebagai Featured."
    : "Tanda Featured dihapus."

  return NextResponse.json({ message })
}
