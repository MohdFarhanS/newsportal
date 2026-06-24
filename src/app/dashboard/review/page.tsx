import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getReviewQueue } from "@/lib/cms-articles"
import { getAllCategories } from "@/lib/categories"
import { formatDistanceToNow } from "date-fns"
import { id as localeId } from "date-fns/locale"
import Pagination from "@/components/layout/Pagination"

export const metadata: Metadata = { title: "Antrian Review" }

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { role } = session.user
  if (role !== "EDITOR" && role !== "ADMIN") redirect("/dashboard")

  const { page: pageParam, category } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)

  const [{ articles, total, totalPages }, categories] = await Promise.all([
    getReviewQueue(page, 20, category),
    getAllCategories(),
  ])

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Redaksi
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />

      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900">
          Antrian Review
        </h1>
        <span className="text-sm text-zinc-400">{total} artikel</span>
      </div>

      {/* Category filter */}
      <form method="GET" className="mb-6 flex items-center gap-2">
        <select
          name="category"
          defaultValue={category ?? ""}
          className="text-sm border border-zinc-200 rounded px-2 py-1.5 text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="text-[11px] uppercase tracking-[0.15em] px-3 py-1.5 border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Filter
        </button>
        {category && (
          <Link
            href="/dashboard/review"
            className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Reset
          </Link>
        )}
      </form>

      {articles.length === 0 ? (
        <div className="border-t border-zinc-100 pt-8 text-center">
          <p className="text-sm text-zinc-400">
            {category ? "Tidak ada artikel dalam kategori ini." : "Tidak ada artikel yang perlu direview."}
          </p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 pb-2 border-b border-zinc-200">
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400">Judul</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 w-28 text-right hidden sm:block">Penulis</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 w-28 text-right hidden md:block">Kategori</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 w-24 text-right">Submit</span>
          </div>

          <div className="divide-y divide-zinc-100">
            {articles.map((article) => (
              <div
                key={article.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-3 items-center"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/review/${article.id}`}
                    className="text-sm font-medium text-zinc-900 hover:text-red-600 transition-colors truncate block"
                  >
                    {article.title}
                  </Link>
                </div>
                <span className="text-xs text-zinc-500 w-28 text-right hidden sm:block truncate">
                  {article.author.name}
                </span>
                <span className="text-xs text-zinc-400 w-28 text-right hidden md:block truncate">
                  {article.category.name}
                </span>
                <span className="text-xs text-zinc-400 w-24 text-right whitespace-nowrap">
                  {formatDistanceToNow(article.updatedAt, { addSuffix: true, locale: localeId })}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                buildHref={(p) =>
                  `/dashboard/review?page=${p}${category ? `&category=${category}` : ""}`
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
