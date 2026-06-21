import { HorizontalCard } from "@/components/news/ArticleCard"
import Pagination from "@/components/layout/Pagination"
import type { ArticleWithRelations } from "@/lib/articles"

interface SearchResultsProps {
  articles: ArticleWithRelations[]
  isLoading: boolean
  isError: boolean
  total: number
  currentPage: number
  totalPages: number
  buildPageHref: (page: number) => string
  query: string
}

export default function SearchResults({
  articles,
  isLoading,
  isError,
  total,
  currentPage,
  totalPages,
  buildPageHref,
  query,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 divide-y divide-[#E4E4E7]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pt-5 first:pt-0 flex gap-3 animate-pulse">
            <div className="w-24 h-20 flex-shrink-0 bg-[#E4E4E7] rounded" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3 bg-[#E4E4E7] rounded w-1/4" />
              <div className="h-4 bg-[#E4E4E7] rounded w-3/4" />
              <div className="h-3 bg-[#E4E4E7] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600">
        Terjadi kesalahan saat memuat hasil. Silakan coba lagi.
      </p>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[#18181B] font-medium text-base mb-1">
          Tidak ada hasil ditemukan
        </p>
        <p className="text-sm text-[#6B7280]">
          {query
            ? `Tidak ada artikel yang cocok dengan "${query}". Coba kata kunci lain atau ubah filter.`
            : "Tidak ada artikel yang cocok dengan filter yang dipilih."}
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-[#6B7280] mb-4">
        Menampilkan {articles.length} dari {total} artikel
      </p>

      <div className="flex flex-col gap-5 divide-y divide-[#E4E4E7]">
        {articles.map((article) => (
          <div key={article.id} className="pt-5 first:pt-0">
            <HorizontalCard article={article} />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-10">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={buildPageHref}
          />
        </div>
      )}
    </div>
  )
}
