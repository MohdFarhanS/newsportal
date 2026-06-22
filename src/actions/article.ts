"use server"

import { revalidatePath } from "next/cache"
import slugify from "slugify"
import DOMPurify from "isomorphic-dompurify"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
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
  const where = excludeId ? { slug: base, id: { not: excludeId } } : { slug: base }
  const existing = await db.article.findFirst({ where, select: { id: true } })
  if (!existing) return base

  for (let i = 1; ; i++) {
    const candidate = `${base}-${i}`
    const whereN = excludeId
      ? { slug: candidate, id: { not: excludeId } }
      : { slug: candidate }
    const conflict = await db.article.findFirst({ where: whereN, select: { id: true } })
    if (!conflict) return candidate
  }
}

export async function createArticleAction(
  data: ArticleInput,
): Promise<{ error?: string; id?: string }> {
  const result = await requireContentRole()
  if ("error" in result) return { error: result.error }
  const { session } = result

  const parsed = articleSchema.safeParse(data)
  if (!parsed.success) return { error: "Data tidak valid" }

  const { title, categoryId, tags: tagIds, excerpt, content, coverImageUrl } = parsed.data
  const slug = await generateUniqueSlug(title)
  const sanitizedContent = DOMPurify.sanitize(content)

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
  data: ArticleInput,
): Promise<{ error?: string }> {
  const result = await requireContentRole()
  if ("error" in result) return { error: result.error }
  const { session } = result

  const existing = await db.article.findFirst({
    where: { id, authorId: session.user.id },
    select: { status: true },
  })
  if (!existing) return { error: "Artikel tidak ditemukan" }
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    return { error: "Artikel tidak dapat diedit" }
  }

  const parsed = articleSchema.safeParse(data)
  if (!parsed.success) return { error: "Data tidak valid" }

  const { title, categoryId, tags: tagIds, excerpt, content, coverImageUrl } = parsed.data
  const slug = await generateUniqueSlug(title, id)
  const sanitizedContent = DOMPurify.sanitize(content)

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
  data: SaveDraftInput,
): Promise<{ error?: string }> {
  const result = await requireContentRole()
  if ("error" in result) return { error: result.error }
  const { session } = result

  const existing = await db.article.findFirst({
    where: { id, authorId: session.user.id, status: "DRAFT" },
    select: { id: true },
  })
  if (!existing) return {}

  const parsed = saveDraftSchema.safeParse(data)
  if (!parsed.success) return {}

  const { title, categoryId, tags: tagIds, excerpt, content, coverImageUrl } = parsed.data
  const updateData: Record<string, unknown> = {}

  if (title !== undefined) {
    updateData.title = title
    updateData.slug = await generateUniqueSlug(title, id)
  }
  if (categoryId !== undefined) updateData.categoryId = categoryId
  if (excerpt !== undefined) updateData.excerpt = excerpt
  if (content !== undefined) updateData.content = DOMPurify.sanitize(content)
  if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl || null

  if (tagIds !== undefined) {
    await db.articleTag.deleteMany({ where: { articleId: id } })
    await db.article.update({
      where: { id },
      data: {
        ...updateData,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    })
  } else if (Object.keys(updateData).length > 0) {
    await db.article.update({ where: { id }, data: updateData })
  }

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
  if (!article.title || !article.content || !article.categoryId || !article.excerpt) {
    return { error: "Lengkapi semua field wajib sebelum submit" }
  }

  await db.article.update({ where: { id }, data: { status: "REVIEW" } })

  revalidatePath("/dashboard/articles")
  return {}
}
