import type { Metadata } from "next"
import { HorizontalCard } from "@/components/news/ArticleCard"
import Pagination from "@/components/layout/Pagination"
import SectionHeader from "@/components/news/SectionHeader"
import { getAllPublishedArticles } from "@/lib/articles"

export const metadata: Metadata = {
  title: "Latest News",
  description: "Semua artikel terbaru dari NewsPortal.",
  alternates: { canonical: "/latest" },
}

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function LatestPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const { articles, totalPages } = await getAllPublishedArticles(page, 12)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Berita Terbaru" />

      {articles.length === 0 ? (
        <p className="text-sm text-[#6B7280]">Belum ada artikel yang dipublikasikan.</p>
      ) : (
        <div className="flex flex-col gap-5 divide-y divide-[#E4E4E7]">
          {articles.map((article) => (
            <div key={article.id} className="pt-5 first:pt-0">
              <HorizontalCard article={article} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/latest"
          />
        </div>
      )}
    </main>
  )
}
