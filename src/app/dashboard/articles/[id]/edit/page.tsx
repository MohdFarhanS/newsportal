import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getAllCategories } from "@/lib/categories"
import { getAllTags } from "@/lib/tags"
import { getArticleForEdit } from "@/lib/cms-articles"
import ArticleForm from "@/components/dashboard/ArticleForm"

export const metadata: Metadata = { title: "Edit Artikel" }

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { role } = session.user
  if (role !== "JOURNALIST" && role !== "EDITOR" && role !== "ADMIN") {
    redirect("/dashboard")
  }

  const { id } = await params
  const [article, categories, tags] = await Promise.all([
    getArticleForEdit(id, session.user.id),
    getAllCategories(),
    getAllTags(),
  ])

  if (!article) notFound()

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Konten
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />
      <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900 mb-1">
        Edit Artikel
      </h1>
      <p className="text-[12px] text-zinc-400 mb-8 font-mono">{article.slug}</p>

      <ArticleForm initialData={article} categories={categories} tags={tags} />
    </div>
  )
}
