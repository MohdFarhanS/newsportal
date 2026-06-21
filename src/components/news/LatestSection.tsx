import SectionHeader from "@/components/news/SectionHeader"
import { HorizontalCard } from "@/components/news/ArticleCard"
import Pagination from "@/components/layout/Pagination"
import type { ArticleWithRelations } from "@/lib/articles"

interface LatestSectionProps {
  articles: ArticleWithRelations[]
  currentPage: number
  totalPages: number
}

export default function LatestSection({ articles, currentPage, totalPages }: LatestSectionProps) {
  return (
    <section aria-label="Berita Terbaru">
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
        <div className="mt-8">
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </section>
  )
}
