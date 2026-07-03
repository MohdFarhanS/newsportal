import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import slugify from "slugify"
import { Prisma } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { tagSchema } from "@/schemas/taxonomy"

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

  const parsed = tagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Data tidak valid." } },
      { status: 400 }
    )
  }

  const existing = await db.tag.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Tag tidak ditemukan." } },
      { status: 404 }
    )
  }

  const { name } = parsed.data
  const slug = slugify(parsed.data.slug, { lower: true, strict: true })

  const slugTaken = await db.tag.findFirst({ where: { slug, id: { not: id } }, select: { id: true } })
  if (slugTaken) {
    return NextResponse.json(
      { error: { code: "SLUG_TAKEN", message: "Slug sudah digunakan." } },
      { status: 400 }
    )
  }

  try {
    const tag = await db.tag.update({ where: { id }, data: { name, slug } })
    revalidatePath("/dashboard/taxonomy")
    return NextResponse.json({ tag })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: { code: "NAME_TAKEN", message: "Nama tag sudah digunakan." } },
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

  const existing = await db.tag.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Tag tidak ditemukan." } },
      { status: 404 }
    )
  }

  // FR-CMS-05: ArticleTag.tag pakai onDelete: Cascade di schema — tanpa guard ini,
  // delete akan diam-diam melepas tag dari artikel (bug v1.0 yang requirement ini tutup).
  // Guard harus jalan SEBELUM delete, tidak bisa mengandalkan FK constraint (Cascade, bukan Restrict).
  const usageCount = await db.articleTag.count({ where: { tagId: id } })
  if (usageCount > 0) {
    return NextResponse.json(
      {
        error: {
          code: "TAG_IN_USE",
          message: `Tag masih dipakai ${usageCount} artikel.`,
        },
      },
      { status: 400 }
    )
  }

  await db.tag.delete({ where: { id } })

  revalidatePath("/dashboard/taxonomy")
  return NextResponse.json({ message: "Tag dihapus." })
}
