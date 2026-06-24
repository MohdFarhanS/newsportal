import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { auth } from "@/lib/auth"
import { getArticleForReview } from "@/lib/cms-articles"
import { SANITIZE_OPTIONS } from "@/lib/sanitize"
import sanitizeHtml from "sanitize-html"
import ReviewActions from "./ReviewActions"

export const metadata: Metadata = { title: "Review Artikel" }

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { role } = session.user
  if (role !== "EDITOR" && role !== "ADMIN") redirect("/dashboard")

  const { id } = await params
  const article = await getArticleForReview(id)
  if (!article) notFound()

  const safeContent = sanitizeHtml(article.content, SANITIZE_OPTIONS)

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Redaksi
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-400 mb-6">
        <Link href="/dashboard/review" className="hover:text-zinc-700 transition-colors">
          Antrian Review
        </Link>
        <span>/</span>
        <span className="text-zinc-600 truncate max-w-xs">{article.title}</span>
      </div>

      {/* Article meta */}
      <div className="mb-6 space-y-1">
        <h1 className="font-heading italic text-[28px] leading-[1.15] font-bold text-zinc-900">
          {article.title}
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          <span className="font-medium text-zinc-700">{article.author.name}</span>
          {" · "}
          {article.category.name}
          {" · "}
          Submit{" "}
          {format(article.updatedAt, "d MMMM yyyy, HH:mm", { locale: localeId })}
        </p>
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {article.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-sm"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Excerpt */}
      <p className="text-sm text-zinc-600 italic border-l-2 border-zinc-300 pl-4 mb-8">
        {article.excerpt}
      </p>

      {/* Article content */}
      <div
        className="article-content text-sm leading-relaxed mb-10"
        dangerouslySetInnerHTML={{ __html: safeContent }}
      />

      {/* Action buttons — FR-AM-07 */}
      <div className="border-t border-zinc-200 pt-6 flex items-center gap-3">
        <ReviewActions articleId={id} />
        <Link
          href="/dashboard/review"
          className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-900 transition-colors ml-2"
        >
          ← Kembali
        </Link>
      </div>
    </div>
  )
}
