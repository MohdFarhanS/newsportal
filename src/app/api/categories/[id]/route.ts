import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import slugify from "slugify"
import { Prisma } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { categorySchema } from "@/schemas/taxonomy"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Login terlebih dahulu." } },
        { status: 401 }
      ),
    }
  }
  if (session.user.role !== "ADMIN") {
    return {
      response: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Akses ditolak." } },
        { status: 403 }
      ),
    }
  }
  return { session }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Body tidak valid." } },
      { status: 400 }
    )
  }

  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Data tidak valid." } },
      { status: 400 }
    )
  }

  const existing = await db.category.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Kategori tidak ditemukan." } },
      { status: 404 }
    )
  }

  const { name, description } = parsed.data
  const slug = slugify(parsed.data.slug, { lower: true, strict: true })

  const slugTaken = await db.category.findFirst({
    where: { slug, id: { not: id } },
    select: { id: true },
  })
  if (slugTaken) {
    return NextResponse.json(
      { error: { code: "SLUG_TAKEN", message: "Slug sudah digunakan." } },
      { status: 400 }
    )
  }

  try {
    const category = await db.category.update({
      where: { id },
      data: { name, slug, description: description || null },
    })
    revalidatePath("/dashboard/taxonomy")
    revalidatePath("/")
    revalidatePath("/category/[slug]", "page")
    return NextResponse.json({ category })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: { code: "NAME_TAKEN", message: "Nama kategori sudah digunakan." } },
        { status: 400 }
      )
    }
    throw e
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response

  const { id } = await params

  const existing = await db.category.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Kategori tidak ditemukan." } },
      { status: 404 }
    )
  }

  // FR-CMS-04: cegah penghapusan kategori yang masih punya artikel terkait.
  const articleCount = await db.article.count({ where: { categoryId: id } })
  if (articleCount > 0) {
    return NextResponse.json(
      {
        error: {
          code: "CATEGORY_IN_USE",
          message: `Kategori masih memiliki ${articleCount} artikel. Pindahkan artikel terlebih dahulu.`,
        },
      },
      { status: 400 }
    )
  }

  try {
    await db.category.delete({ where: { id } })
  } catch (e) {
    // Fallback pertahanan jika terjadi race antara count-check dan delete (Article.categoryId RESTRICT).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json(
        { error: { code: "CATEGORY_IN_USE", message: "Kategori masih memiliki artikel terkait." } },
        { status: 400 }
      )
    }
    throw e
  }

  revalidatePath("/dashboard/taxonomy")
  revalidatePath("/")
  return NextResponse.json({ message: "Kategori dihapus." })
}
