"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
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

async function fetchArticles(params: URLSearchParams, signal?: AbortSignal): Promise<SearchApiResponse> {
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

  const [data, setData] = useState<SearchApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (debouncedQuery === urlQuery) return
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedQuery) params.set("q", debouncedQuery)
    else params.delete("q")
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [debouncedQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (urlQuery) params.set("search", urlQuery)
    if (urlCategory) params.set("category", urlCategory)
    if (urlTag) params.set("tag", urlTag)
    if (urlDate) params.set("date", urlDate)
    if (urlPage > 1) params.set("page", String(urlPage))

    setIsLoading(true)
    setIsError(false)
    fetchArticles(params, controller.signal)
      .then((d) => {
        setData(d)
        setIsLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setIsError(true)
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [urlQuery, urlCategory, urlTag, urlDate, urlPage])

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
