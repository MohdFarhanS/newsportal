"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { useDebounce } from "@/lib/hooks/use-debounce"
import SearchInput from "@/components/search/SearchInput"
import FilterPanel from "@/components/search/FilterPanel"
import SearchResults from "@/components/search/SearchResults"
import type { ArticleWithRelations } from "@/lib/articles"

type Category = { id: string; name: string; slug: string }
type Tag = { id: string; name: string; slug: string }

interface SearchClientProps {
  initialCategories: Category[]
  initialTags: Tag[]
}

type SearchApiResponse = {
  data: ArticleWithRelations[]
  meta: { total: number; page: number; totalPages: number; perPage: number }
}

async function fetchArticles(params: URLSearchParams): Promise<SearchApiResponse> {
  const res = await fetch(`/api/articles?${params.toString()}`)
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

  useEffect(() => {
    if (debouncedQuery === urlQuery) return
    const params = new URLSearchParams(searchParams.toString())
    if (debouncedQuery) params.set("q", debouncedQuery)
    else params.delete("q")
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [debouncedQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const apiParams = new URLSearchParams()
  if (urlQuery) apiParams.set("search", urlQuery)
  if (urlCategory) apiParams.set("category", urlCategory)
  if (urlTag) apiParams.set("tag", urlTag)
  if (urlDate) apiParams.set("date", urlDate)
  if (urlPage > 1) apiParams.set("page", String(urlPage))

  const { data, isLoading, isError } = useQuery({
    queryKey: ["articles", urlQuery, urlCategory, urlTag, urlDate, urlPage],
    queryFn: () => fetchArticles(apiParams),
  })

  function buildPageHref(page: number): string {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) params.delete("page")
    else params.set("page", String(page))
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput value={inputValue} onChange={setInputValue} />
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
