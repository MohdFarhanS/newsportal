import type { Metadata } from "next"
import { HorizontalCard } from "@/components/news/ArticleCard"
import Pagination from "@/components/layout/Pagination"
import SectionHeader from "@/components/news/SectionHeader"
import { getLatestArticles } from "@/lib/articles"
import { parsePage } from "@/lib/pagination"

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const page = parsePage(pageParam)
  const isPaginated = page > 1
  const canonical = isPaginated ? `/latest?page=${page}` : "/latest"
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const ogImage = `${base}/og-default.jpg`

  return {
    title: "Latest News",
    description: "Semua artikel terbaru dari NewsPortal.",
    alternates: { canonical },
    ...(isPaginated && { robots: { index: false, follow: true } }),
    openGraph: {
      title: "Latest News | NewsPortal",
      description: "Semua artikel terbaru dari NewsPortal.",
      type: "website",
      url: canonical,
      images: [{ url: ogImage, alt: "NewsPortal" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Latest News | NewsPortal",
      description: "Semua artikel terbaru dari NewsPortal.",
      images: [ogImage],
    },
  }
}

export default async function LatestPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const page = parsePage(pageParam)

  const { articles, totalPages } = await getLatestArticles(page, 12, true)

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
