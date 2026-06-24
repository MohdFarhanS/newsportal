import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getUserReadingHistory } from "@/lib/readingHistory"
import { HorizontalCard } from "@/components/news/ArticleCard"
import Pagination from "@/components/layout/Pagination"
import { ClearHistoryButton } from "./ClearHistoryButton"
import { DeleteHistoryItemButton } from "./DeleteHistoryItemButton"
import type { ArticleWithRelations } from "@/lib/articles"

export const metadata: Metadata = { title: "Riwayat Baca" }

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function HistoryPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)

  const { items, totalPages } = await getUserReadingHistory(session.user.id, page)

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Aktivitas
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900">
          Riwayat Baca
        </h1>
        {items.length > 0 && <ClearHistoryButton />}
      </div>

      {items.length === 0 ? (
        <div className="border-t border-zinc-100 pt-8 text-center">
          <p className="text-sm text-zinc-400 mb-4">Belum ada artikel yang dibaca.</p>
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
            {items.map(({ id, article }) => (
              <div key={id} className="py-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <HorizontalCard article={article as ArticleWithRelations} />
                </div>
                <DeleteHistoryItemButton id={id} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                basePath="/dashboard/history"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
