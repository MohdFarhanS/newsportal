import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getUserArticles } from "@/lib/cms-articles"
import { formatDistanceToNow } from "date-fns"
import { id as localeId } from "date-fns/locale"
import type { ArticleStatus } from "@/generated/prisma/client"

export const metadata: Metadata = { title: "Artikel Saya" }

const STATUS_LABEL: Record<ArticleStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "Review",
  REJECTED: "Ditolak",
  SCHEDULED: "Terjadwal",
  PUBLISHED: "Tayang",
}

const STATUS_CLASS: Record<ArticleStatus, string> = {
  DRAFT: "text-zinc-500 bg-zinc-100",
  REVIEW: "text-blue-600 bg-blue-50",
  REJECTED: "text-red-600 bg-red-50",
  SCHEDULED: "text-orange-600 bg-orange-50",
  PUBLISHED: "text-green-600 bg-green-50",
}

export default async function ArticlesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { role } = session.user
  if (role !== "JOURNALIST" && role !== "EDITOR" && role !== "ADMIN") {
    redirect("/dashboard")
  }

  const { articles } = await getUserArticles(session.user.id)

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Konten
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />

      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900">
          Artikel Saya
        </h1>
        <Link
          href="/dashboard/articles/new"
          className="text-[11px] uppercase tracking-[0.15em] bg-zinc-900 text-white px-3 py-1.5 hover:bg-zinc-700 transition-colors"
        >
          + Tulis Artikel
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="border-t border-zinc-100 pt-8 text-center">
          <p className="text-sm text-zinc-400 mb-4">Belum ada artikel.</p>
          <Link
            href="/dashboard/articles/new"
            className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            Tulis artikel pertamamu →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {articles.map((article) => (
            <div key={article.id} className="py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{article.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {article.category.name} ·{" "}
                  {formatDistanceToNow(article.updatedAt, {
                    addSuffix: true,
                    locale: localeId,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm font-medium ${STATUS_CLASS[article.status]}`}
                >
                  {STATUS_LABEL[article.status]}
                </span>
                {(article.status === "DRAFT" || article.status === "REJECTED") && (
                  <Link
                    href={`/dashboard/articles/${article.id}/edit`}
                    className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-300 hover:text-zinc-900 hover:border-zinc-500 pb-0.5 transition-colors"
                  >
                    Edit
                  </Link>
                )}
                {article.status === "PUBLISHED" && (
                  <Link
                    href={`/article/${article.slug}`}
                    target="_blank"
                    className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-300 hover:text-zinc-900 hover:border-zinc-500 pb-0.5 transition-colors"
                  >
                    Lihat
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
