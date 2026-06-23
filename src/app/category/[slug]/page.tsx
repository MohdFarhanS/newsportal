import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { HorizontalCard } from "@/components/news/ArticleCard"
import Pagination from "@/components/layout/Pagination"
import SectionHeader from "@/components/news/SectionHeader"
import { getArticlesByCategory } from "@/lib/articles"
import { getCategoryBySlug } from "@/lib/categories"

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return {}
  const description = category.description ?? `Artikel kategori ${category.name} dari NewsPortal.`
  return {
    title: category.name,
    description,
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      title: `${category.name} | NewsPortal`,
      description,
      type: "website",
      url: `/category/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} | NewsPortal`,
      description,
    },
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const { articles, totalPages } = await getArticlesByCategory(slug, page, 12)

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: base },
      { "@type": "ListItem", position: 2, name: category.name, item: `${base}/category/${slug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <SectionHeader title={category.name} />

        {category.description && (
          <p className="text-sm text-[#6B7280] mb-6 -mt-2">{category.description}</p>
        )}

        {articles.length === 0 ? (
          <p className="text-sm text-[#6B7280]">Belum ada artikel di kategori ini.</p>
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
              basePath={`/category/${slug}`}
            />
          </div>
        )}
      </main>
    </>
  )
}