import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath, revalidateTag } from "next/cache"
import type { ArticleStatus } from "@/generated/prisma/client"

const VALID_STATUSES: ArticleStatus[] = ["DRAFT", "REVIEW", "REJECTED", "SCHEDULED", "PUBLISHED"]

function isValidStatus(value: unknown): value is ArticleStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as ArticleStatus)
}

const STATUS_MESSAGE: Record<ArticleStatus, string> = {
  DRAFT: "Status artikel diubah menjadi Draft (override admin).",
  REVIEW: "Status artikel diubah menjadi Review (override admin).",
  REJECTED: "Artikel ditolak (override admin).",
  SCHEDULED: "Artikel dijadwalkan untuk dipublikasikan (override admin).",
  PUBLISHED: "Artikel dipublikasikan (override admin).",
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Login terlebih dahulu." } },
      { status: 401 }
    )
  }

  // ADMIN-only — beda dari /review (EDITOR || ADMIN). FR-AM-09 eksplisit "Admin", bukan editor+.
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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Body tidak valid." } },
      { status: 400 }
    )
  }

  const { status, rejectionNote, scheduledAt } = body as {
    status: unknown
    rejectionNote?: unknown
    scheduledAt?: unknown
  }

  if (!isValidStatus(status)) {
    return NextResponse.json(
      { error: { code: "INVALID_STATUS", message: "Status tidak valid." } },
      { status: 400 }
    )
  }

  const noteStr = typeof rejectionNote === "string" ? rejectionNote.trim() : ""
  if (status === "REJECTED" && !noteStr) {
    return NextResponse.json(
      { error: { code: "MISSING_NOTE", message: "Catatan penolakan wajib diisi." } },
      { status: 400 }
    )
  }
  if (status === "REJECTED" && noteStr.length > 2000) {
    return NextResponse.json(
      { error: { code: "NOTE_TOO_LONG", message: "Catatan penolakan maksimal 2000 karakter." } },
      { status: 400 }
    )
  }

  let parsedScheduledAt: Date | null = null
  if (status === "SCHEDULED") {
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

  // Tidak ada precondition status — override memang dimaksud menimpa status apapun.
  // Cuma cek artikel-nya ada (404), bukan TOCTOU 409 seperti /review.
  const existing = await db.article.findUnique({
    where: { id },
    select: { slug: true },
  })
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Artikel tidak ditemukan." } },
      { status: 404 }
    )
  }

  await db.article.update({
    where: { id },
    data: {
      status,
      scheduledAt: status === "SCHEDULED" ? parsedScheduledAt : null,
      rejectionNote: status === "REJECTED" ? noteStr : null,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  })

  // Selalu revalidate halaman publik — override bisa membuat artikel hilang/muncul di kedua arah.
  revalidatePath("/dashboard/manage-articles")
  revalidatePath("/dashboard/articles")
  revalidatePath("/dashboard/review")
  revalidatePath("/")
  revalidatePath("/latest")
  revalidatePath("/category/[slug]", "page")
  revalidatePath(`/article/${existing.slug}`)
  revalidateTag("analytics")

  return NextResponse.json({ message: STATUS_MESSAGE[status] })
}
