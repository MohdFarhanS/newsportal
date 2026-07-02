import { Suspense } from "react"
import type { Metadata } from "next"
import { getFeaturedArticles, getLatestArticles, getTrendingArticles } from "@/lib/articles"
import { parsePage } from "@/lib/pagination"
import FeaturedSection from "@/components/news/FeaturedSection"
import LatestSection from "@/components/news/LatestSection"
import TrendingSection from "@/components/news/TrendingSection"

interface HomeProps {
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const page = parsePage(pageParam)
  const isPaginated = page > 1
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const ogImage = `${base}/og-default.jpg`
  // Next.js drops the query string from metadataBase-resolved canonical/og:url
  // for the root path specifically (confirmed across relative/absolute/URL-object
  // forms) — noindex below still prevents duplicate-content indexing regardless.
  const canonical = isPaginated ? `/?page=${page}` : "/"

  return {
    title: "NewsPortal — Portal Berita Indonesia",
    description: "Portal berita modern dengan konten terkini dan terpercaya untuk pembaca Indonesia.",
    alternates: { canonical },
    ...(isPaginated && { robots: { index: false, follow: true } }),
    openGraph: {
      title: "NewsPortal — Portal Berita Indonesia",
      description: "Portal berita modern dengan konten terkini dan terpercaya untuk pembaca Indonesia.",
      type: "website",
      url: canonical,
      images: [{ url: ogImage, alt: "NewsPortal" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "NewsPortal — Portal Berita Indonesia",
      description: "Portal berita modern dengan konten terkini dan terpercaya untuk pembaca Indonesia.",
      images: [ogImage],
    },
  }
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
  const page = parsePage(pageParam)

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
