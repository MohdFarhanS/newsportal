"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import FilterPanel, { type Category, type Tag } from "@/components/search/FilterPanel"
import SearchResults from "@/components/search/SearchResults"
import type { ArticleWithRelations } from "@/lib/articles"

interface SearchClientProps {
  initialCategories: Category[]
  initialTags: Tag[]
}

type SearchApiResponse = {
  data: ArticleWithRelations[]
  meta: { total: number; page: number; totalPages: number; perPage: number }
}

async function fetchArticles(params: URLSearchParams, signal: AbortSignal): Promise<SearchApiResponse> {
  const res = await fetch(`/api/articles?${params.toString()}`, { signal })
  if (!res.ok) throw new Error("Search request failed")
  return res.json()
}

export default function SearchClient({ initialCategories, initialTags }: SearchClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlQuery = searchParams.get("q") ?? ""
  const urlCategory = searchParams.get("category") ?? ""
  const urlTag = searchParams.get("tag") ?? ""
  const urlDate = searchParams.get("date") ?? ""
  const urlPage = Math.max(1, Number(searchParams.get("page")) || 1)

  const [inputValue, setInputValue] = useState(urlQuery)
  const debouncedQuery = useDebounce(inputValue, 300)

  const params = new URLSearchParams()
  if (urlQuery) params.set("search", urlQuery)
  if (urlCategory) params.set("category", urlCategory)
  if (urlTag) params.set("tag", urlTag)
  if (urlDate) params.set("date", urlDate)
  if (urlPage > 1) params.set("page", String(urlPage))

  const { data, isLoading, isError } = useQuery({
    queryKey: ["articles", urlQuery, urlCategory, urlTag, urlDate, urlPage],
    queryFn: ({ signal }) => fetchArticles(params, signal),
  })

  useEffect(() => {
    if (debouncedQuery === urlQuery) return
    const next = new URLSearchParams(searchParams.toString())
    if (debouncedQuery) next.set("q", debouncedQuery)
    else next.delete("q")
    next.delete("page")
    router.push(`${pathname}?${next.toString()}`, { scroll: false })
  }, [debouncedQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function buildPageHref(page: number): string {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) params.delete("page")
    else params.set("page", String(page))
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none"
          />
          <Input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Cari artikel..."
            className="pl-9 bg-white border-[#E4E4E7] focus-visible:ring-[#18181B]"
            aria-label="Cari artikel"
          />
        </div>
      </div>

      <FilterPanel
        categories={initialCategories}
        tags={initialTags}
        selectedCategory={urlCategory}
        selectedTag={urlTag}
        selectedDate={urlDate}
        onCategoryChange={(slug) => updateFilter("category", slug)}
        onTagChange={(slug) => updateFilter("tag", slug)}
        onDateChange={(preset) => updateFilter("date", preset)}
      />

      <SearchResults
        articles={data?.data ?? []}
        isLoading={isLoading}
        isError={isError}
        total={data?.meta.total ?? 0}
        currentPage={urlPage}
        totalPages={data?.meta.totalPages ?? 0}
        buildPageHref={buildPageHref}
        query={urlQuery}
      />
    </div>
  )
}
