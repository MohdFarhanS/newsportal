import type { Metadata } from "next"
import { Suspense } from "react"
import { getAllCategories } from "@/lib/categories"
import { getAllTags } from "@/lib/tags"
import SearchClient from "@/components/search/SearchClient"
import SectionHeader from "@/components/news/SectionHeader"

export const metadata: Metadata = {
  title: "Cari Artikel",
  description: "Temukan artikel yang relevan menggunakan pencarian dan filter.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
}

export default async function SearchPage() {
  const [categories, tags] = await Promise.all([getAllCategories(), getAllTags()])

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader title="Cari Artikel" />
      <Suspense>
        <SearchClient initialCategories={categories} initialTags={tags} />
      </Suspense>
    </main>
  )
}
