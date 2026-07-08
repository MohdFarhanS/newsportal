"use server"

import { revalidatePath } from "next/cache"
import slugify from "slugify"
import sanitizeHtml from "sanitize-html"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { SANITIZE_OPTIONS } from "@/lib/sanitize"
import { verifyUploadedImage } from "@/lib/cloudinary-verify"
import {
  articleSchema,
  saveDraftSchema,
  type ArticleInput,
  type SaveDraftInput,
} from "@/schemas/article"

async function requireContentRole() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" as const }
  const { role } = session.user
  if (role !== "JOURNALIST" && role !== "EDITOR" && role !== "ADMIN") {
    return { error: "Forbidden" as const }
  }
  return { session }
}

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true })
  const taken = await db.article.findMany({
    where: {
      slug: { startsWith: base },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  })
  if (!taken.length) return base
  const slugSet = new Set(taken.map((a) => a.slug))
  if (!slugSet.has(base)) return base
  for (let i = 1; ; i++) {
    const candidate = `${base}-${i}`
    if (!slugSet.has(candidate)) return candidate
  }
}

export async function createArticleAction(
  data: ArticleInput & { coverImagePublicId?: string },
): Promise<{ error?: string; id?: string }> {
  const result = await requireContentRole()
  if ("error" in result) return { error: result.error }
  const { session } = result

  const { coverImagePublicId, ...rest } = data
  const parsed = articleSchema.safeParse(rest)
  if (!parsed.success) return { error: "Data tidak valid" }

  const { title, categoryId, tags: tagIds, excerpt, content } = parsed.data
  let coverImageUrl = parsed.data.coverImageUrl

  // Artikel baru selalu mulai tanpa cover — coverImageUrl apapun yang terisi di sini
  // adalah upload baru, wajib terverifikasi.
  if (coverImageUrl) {
    const verified = await verifyUploadedImage(coverImagePublicId)
    if (!verified.ok) return { error: verified.reason }
    coverImageUrl = verified.secureUrl
  }

  const slug = await generateUniqueSlug(title)
  const sanitizedContent = sanitizeHtml(content, SANITIZE_OPTIONS)

  const article = await db.article.create({
    data: {
      authorId: session.user.id,
      categoryId,
      title,
      slug,
      excerpt,
      content: sanitizedContent,
      coverImageUrl: coverImageUrl || null,
      status: "DRAFT",
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    select: { id: true },
  })

  return { id: article.id }
}

export async function updateArticleAction(
  id: string,
  data: ArticleInput & { coverImagePublicId?: string },
): Promise<{ error?: string }> {
  const result = await requireContentRole()
  if ("error" in result) return { error: result.error }
  const { session } = result

  const existing = await db.article.findFirst({
    where: { id, authorId: session.user.id },
    select: { status: true, coverImageUrl: true },
  })
  if (!existing) return { error: "Artikel tidak ditemukan" }
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    return { error: "Artikel tidak dapat diedit" }
  }

  const { coverImagePublicId, ...rest } = data
  const parsed = articleSchema.safeParse(rest)
  if (!parsed.success) return { error: "Data tidak valid" }

  const { title, categoryId, tags: tagIds, excerpt, content } = parsed.data
  let coverImageUrl = parsed.data.coverImageUrl

  // Hanya re-verifikasi kalau coverImageUrl benar-benar berubah dari yang sudah
  // tersimpan — cover lama yang tidak disentuh tidak perlu diverifikasi ulang.
  if (coverImageUrl && coverImageUrl !== (existing.coverImageUrl ?? "")) {
    const verified = await verifyUploadedImage(coverImagePublicId)
    if (!verified.ok) return { error: verified.reason }
    coverImageUrl = verified.secureUrl
  }

  const slug = await generateUniqueSlug(title, id)
  const sanitizedContent = sanitizeHtml(content, SANITIZE_OPTIONS)

  await db.articleTag.deleteMany({ where: { articleId: id } })
  await db.article.update({
    where: { id },
    data: {
      title,
      slug,
      categoryId,
      excerpt,
      content: sanitizedContent,
      coverImageUrl: coverImageUrl || null,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
  })

  revalidatePath("/dashboard/articles")
  revalidatePath(`/dashboard/articles/${id}/edit`)
  return {}
}

export async function saveDraftAction(
  id: string,
  data: SaveDraftInput & { coverImagePublicId?: string },
): Promise<{ error?: string }> {
  const result = await requireContentRole()
  if ("error" in result) return { error: result.error }
  const { session } = result

  const existing = await db.article.findFirst({
    where: { id, authorId: session.user.id, status: "DRAFT" },
    select: { id: true, coverImageUrl: true, tags: { select: { tagId: true } } },
  })
  if (!existing) return {}

  const { coverImagePublicId, ...rest } = data
  const parsed = saveDraftSchema.safeParse(rest)
  if (!parsed.success) return {}

  const { title, categoryId, tags: tagIds, excerpt, content, coverImageUrl } = parsed.data
  const updateData: Record<string, unknown> = {}

  if (title !== undefined) {
    updateData.title = title
    updateData.slug = await generateUniqueSlug(title, id)
  }
  if (categoryId !== undefined) updateData.categoryId = categoryId
  if (excerpt !== undefined) updateData.excerpt = excerpt
  if (content !== undefined) updateData.content = sanitizeHtml(content, SANITIZE_OPTIONS)
  if (coverImageUrl !== undefined) {
    if (!coverImageUrl || coverImageUrl === (existing.coverImageUrl ?? "")) {
      updateData.coverImageUrl = coverImageUrl || null
    } else {
      // Autosave bersifat silent/fire-and-forget (lihat useEffect di ArticleForm) — kalau
      // verifikasi gagal, skip cover field ini saja (bukan gagalkan seluruh autosave).
      // User akan lihat error eksplisit lewat tombol "Simpan Draft" (updateArticleAction).
      const verified = await verifyUploadedImage(coverImagePublicId)
      if (verified.ok) updateData.coverImageUrl = verified.secureUrl
    }
  }

  if (tagIds !== undefined) {
    const existingTagIds = existing.tags.map((t) => t.tagId).sort().join(",")
    const newTagIds = [...tagIds].sort().join(",")
    if (existingTagIds !== newTagIds) {
      await db.articleTag.deleteMany({ where: { articleId: id } })
      await db.article.update({
        where: { id },
        data: { ...updateData, tags: { create: tagIds.map((tagId) => ({ tagId })) } },
      })
    } else if (Object.keys(updateData).length > 0) {
      await db.article.update({ where: { id }, data: updateData })
    }
  } else if (Object.keys(updateData).length > 0) {
    await db.article.update({ where: { id }, data: updateData })
  }

  revalidatePath("/dashboard/articles")
  return {}
}

export async function submitForReviewAction(id: string): Promise<{ error?: string }> {
  const result = await requireContentRole()
  if ("error" in result) return { error: result.error }
  const { session } = result

  const article = await db.article.findFirst({
    where: { id, authorId: session.user.id },
    select: { status: true, title: true, content: true, categoryId: true, excerpt: true },
  })
  if (!article) return { error: "Artikel tidak ditemukan" }
  if (article.status !== "DRAFT" && article.status !== "REJECTED") {
    return { error: "Status tidak valid untuk submit" }
  }
  const hasContent = article.content.replace(/<[^>]*>/g, "").trim().length > 0
  if (!article.title || !hasContent || !article.categoryId || !article.excerpt) {
    return { error: "Lengkapi semua field wajib sebelum submit" }
  }

  const updated = await db.article.updateMany({
    where: { id, authorId: session.user.id, status: { in: ["DRAFT", "REJECTED"] } },
    data: { status: "REVIEW" },
  })
  if (updated.count === 0) return { error: "Status artikel telah berubah. Muat ulang halaman." }

  revalidatePath("/dashboard/articles")
  return {}
}
