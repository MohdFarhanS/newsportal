import SectionHeader from "@/components/news/SectionHeader"
import { NumberedCard } from "@/components/news/ArticleCard"
import type { TrendingArticle } from "@/lib/articles"

interface TrendingSectionProps {
  articles: TrendingArticle[]
}

export default function TrendingSection({ articles }: TrendingSectionProps) {
  return (
    <aside aria-label="Trending">
      <SectionHeader title="Trending" />
      {articles.length === 0 ? (
        <p className="text-sm text-[#6B7280]">Belum ada data trending.</p>
      ) : (
        <div className="flex flex-col gap-5 divide-y divide-[#E4E4E7]">
          {articles.map((article, index) => (
            <div key={article.id} className="pt-5 first:pt-0">
              <NumberedCard article={article} rank={index + 1} />
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
