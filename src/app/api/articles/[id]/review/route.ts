import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath, revalidateTag } from "next/cache"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login terlebih dahulu." } },
      { status: 401 }
    )
  }

  const { role } = session.user
  if (role !== "EDITOR" && role !== "ADMIN") {
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

  const { action, note, scheduledAt } = body as {
    action: unknown
    note?: unknown
    scheduledAt?: unknown
  }

  if (action !== "approve" && action !== "reject" && action !== "schedule") {
    return NextResponse.json(
      { error: { code: "INVALID_ACTION", message: "Aksi tidak valid." } },
      { status: 400 }
    )
  }

  const noteStr = typeof note === "string" ? note.trim() : ""

  if (action === "reject" && !noteStr) {
    return NextResponse.json(
      { error: { code: "MISSING_NOTE", message: "Catatan penolakan wajib diisi." } },
      { status: 400 }
    )
  }
  if (action === "reject" && noteStr.length > 2000) {
    return NextResponse.json(
      { error: { code: "NOTE_TOO_LONG", message: "Catatan penolakan maksimal 2000 karakter." } },
      { status: 400 }
    )
  }

  let parsedScheduledAt: Date | null = null
  if (action === "schedule") {
    if (typeof scheduledAt !== "string") {
      return NextResponse.json(
        { error: { code: "INVALID_SCHEDULED_AT", message: "scheduledAt harus berupa string ISO datetime." } },
        { status: 400 }
      )
    }
    const parsed = new Date(scheduledAt)
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: { code: "INVALID_SCHEDULED_AT", message: "scheduledAt tidak valid." } },
        { status: 400 }
      )
    }
    if (parsed <= new Date()) {
      return NextResponse.json(
        { error: { code: "INVALID_SCHEDULED_AT", message: "Waktu jadwal harus di masa depan." } },
        { status: 400 }
      )
    }
    parsedScheduledAt = parsed
  }

  const { id } = await params

  const article = await db.article.findFirst({
    where: { id, status: "REVIEW" },
    select: { slug: true },
  })
  if (!article) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Artikel tidak ditemukan atau bukan dalam status REVIEW." } },
      { status: 404 }
    )
  }

  if (action === "approve") {
    // ponytail: updateMany for TOCTOU safety; returns count=0 if status changed between check and write
    const result = await db.article.updateMany({
      where: { id, status: "REVIEW" },
      data: { status: "PUBLISHED", publishedAt: new Date(), rejectionNote: null },
    })
    if (result.count === 0) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Status artikel telah berubah. Muat ulang halaman." } },
        { status: 409 }
      )
    }
    revalidatePath("/dashboard/review")
    revalidatePath("/dashboard/articles")
    revalidatePath("/")
    revalidatePath("/latest")
    revalidatePath("/category/[slug]", "page")
    revalidatePath(`/article/${article.slug}`)
    revalidatePath("/sitemap.xml")
    revalidateTag("analytics")
    return NextResponse.json({ message: "Artikel disetujui dan dipublikasikan." })
  }

  if (action === "schedule") {
    const result = await db.article.updateMany({
      where: { id, status: "REVIEW" },
      data: { status: "SCHEDULED", scheduledAt: parsedScheduledAt, rejectionNote: null },
    })
    if (result.count === 0) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Status artikel telah berubah. Muat ulang halaman." } },
        { status: 409 }
      )
    }
    revalidatePath("/dashboard/review")
    revalidatePath("/dashboard/articles")
    return NextResponse.json({ message: "Artikel dijadwalkan untuk dipublikasikan." })
  }

  // action === "reject"
  const result = await db.article.updateMany({
    where: { id, status: "REVIEW" },
    data: { status: "REJECTED", rejectionNote: noteStr },
  })
  if (result.count === 0) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Status artikel telah berubah. Muat ulang halaman." } },
      { status: 409 }
    )
  }
  revalidatePath("/dashboard/review")
  revalidatePath("/dashboard/articles")
  return NextResponse.json({ message: "Artikel ditolak." })
}
