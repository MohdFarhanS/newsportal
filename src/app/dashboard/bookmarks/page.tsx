import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getUserBookmarks } from "@/lib/bookmarks"
import { HorizontalCard } from "@/components/news/ArticleCard"
import Pagination from "@/components/layout/Pagination"
import type { ArticleWithRelations } from "@/lib/articles"

export const metadata: Metadata = { title: "Bookmark Saya" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function BookmarksPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)

  const { bookmarks, totalPages } = await getUserBookmarks(session.user.id, page)

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Aktivitas
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />

      <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900 mb-6">
        Bookmark Saya
      </h1>

      {bookmarks.length === 0 ? (
        <div className="border-t border-zinc-100 pt-8 text-center">
          <p className="text-sm text-zinc-400 mb-4">Belum ada artikel yang di-bookmark.</p>
          <Link
            href="/"
            className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            Jelajahi artikel →
          </Link>
        </div>
      ) : (
        <>
          <div className="divide-y divide-zinc-100">
            {bookmarks.map(({ article }) => (
              <div key={article.id} className="py-4">
                <HorizontalCard article={article as ArticleWithRelations} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                basePath="/dashboard/bookmarks"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
