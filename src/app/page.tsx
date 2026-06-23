import { Suspense } from "react"
import type { Metadata } from "next"
import { getFeaturedArticles, getLatestArticles, getTrendingArticles } from "@/lib/articles"
import FeaturedSection from "@/components/news/FeaturedSection"
import LatestSection from "@/components/news/LatestSection"
import TrendingSection from "@/components/news/TrendingSection"

export const metadata: Metadata = {
  title: "NewsPortal — Portal Berita Indonesia",
  description: "Portal berita modern dengan konten terkini dan terpercaya untuk pembaca Indonesia.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NewsPortal — Portal Berita Indonesia",
    description: "Portal berita modern dengan konten terkini dan terpercaya untuk pembaca Indonesia.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "NewsPortal — Portal Berita Indonesia",
    description: "Portal berita modern dengan konten terkini dan terpercaya untuk pembaca Indonesia.",
  },
}

interface HomeProps {
  searchParams: Promise<{ page?: string }>
}

function SectionSkeleton({ className = "h-64" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-100 ${className}`} />
}

async function FeaturedWrapper() {
  const articles = await getFeaturedArticles()
  return (
    <>
      <FeaturedSection articles={articles} />
      <hr className="border-[#E4E4E7] mb-10" />
    </>
  )
}

async function LatestWrapper({ page }: { page: number }) {
  const { articles, totalPages } = await getLatestArticles(page)
  return <LatestSection articles={articles} currentPage={page} totalPages={totalPages} />
}

async function TrendingWrapper() {
  const articles = await getTrendingArticles()
  return <TrendingSection articles={articles} />
}

export default async function Home({ searchParams }: HomeProps) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  return (
    <main>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SectionSkeleton className="h-[420px] mb-10" />}>
          <FeaturedWrapper />
        </Suspense>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
          <Suspense fallback={<SectionSkeleton className="h-[600px]" />}>
            <LatestWrapper page={page} />
          </Suspense>
          <Suspense fallback={<SectionSkeleton className="h-[400px]" />}>
            <TrendingWrapper />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
