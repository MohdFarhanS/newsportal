import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import slugify from "slugify"
import { Prisma } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { categorySchema } from "@/schemas/taxonomy"

export async function GET() {
  const categories = await db.category.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json({ data: categories })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login terlebih dahulu." } },
      { status: 401 }
    )
  }
  if (session.user.role !== "ADMIN") {
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

  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Data tidak valid." } },
      { status: 400 }
    )
  }

  const { name, description } = parsed.data
  const slug = slugify(parsed.data.slug, { lower: true, strict: true })

  const slugTaken = await db.category.findUnique({ where: { slug }, select: { id: true } })
  if (slugTaken) {
    return NextResponse.json(
      { error: { code: "SLUG_TAKEN", message: "Slug sudah digunakan." } },
      { status: 400 }
    )
  }

  try {
    const category = await db.category.create({
      data: { name, slug, description: description || null },
    })
    revalidatePath("/dashboard/taxonomy")
    revalidatePath("/")
    return NextResponse.json({ category }, { status: 201 })
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
