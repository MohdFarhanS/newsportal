import SectionHeader from "@/components/news/SectionHeader"
import { HeroCard, SecondaryCard } from "@/components/news/ArticleCard"
import type { ArticleWithRelations } from "@/lib/articles"

interface FeaturedSectionProps {
  articles: ArticleWithRelations[]
}

export default function FeaturedSection({ articles }: FeaturedSectionProps) {
  if (articles.length === 0) {
    return (
      <section aria-label="Berita Utama" className="mb-10">
        <SectionHeader title="Berita Utama" />
        <p className="text-sm text-[#6B7280]">Belum ada berita utama.</p>
      </section>
    )
  }

  const [hero, ...secondary] = articles

  return (
    <section aria-label="Berita Utama" className="mb-10">
      <SectionHeader title="Berita Utama" />
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6">
        <div>
          <HeroCard article={hero} />
        </div>
        {secondary.length > 0 && (
          <div className="flex flex-col gap-4 divide-y divide-[#E4E4E7]">
            {secondary.map((article) => (
              <div key={article.id} className="pt-4 first:pt-0">
                <SecondaryCard article={article} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
