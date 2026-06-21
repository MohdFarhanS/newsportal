import { getFeaturedArticles, getLatestArticles, getTrendingArticles } from "@/lib/articles"
import FeaturedSection from "@/components/news/FeaturedSection"
import LatestSection from "@/components/news/LatestSection"
import TrendingSection from "@/components/news/TrendingSection"

interface HomeProps {
  searchParams: Promise<{ page?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const [featured, { articles: latest, totalPages }, trending] = await Promise.all([
    getFeaturedArticles(),
    getLatestArticles(page),
    getTrendingArticles(),
  ])

  return (
    <main>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FeaturedSection articles={featured} />
        <hr className="border-[#E4E4E7] mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
          <LatestSection articles={latest} currentPage={page} totalPages={totalPages} />
          <TrendingSection articles={trending} />
        </div>
      </div>
    </main>
  )
}
