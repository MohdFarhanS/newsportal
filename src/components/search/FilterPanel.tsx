"use client"

import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type Category = { id: string; name: string; slug: string }
type Tag = { id: string; name: string; slug: string }

const DATE_PRESETS = [
  { label: "Semua", value: "" },
  { label: "7 hari", value: "7d" },
  { label: "30 hari", value: "30d" },
  { label: "90 hari", value: "90d" },
] as const

interface FilterPanelProps {
  categories: Category[]
  tags: Tag[]
  selectedCategory: string
  selectedTag: string
  selectedDate: string
  onCategoryChange: (slug: string) => void
  onTagChange: (slug: string) => void
  onDateChange: (preset: string) => void
}

function FilterContent({
  categories,
  tags,
  selectedCategory,
  selectedTag,
  selectedDate,
  onCategoryChange,
  onTagChange,
  onDateChange,
}: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] mb-2">
          Kategori
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange("")}
            className={[
              "text-xs px-3 py-1 rounded-full border transition-colors",
              selectedCategory === ""
                ? "bg-[#18181B] text-white border-[#18181B]"
                : "border-[#E4E4E7] text-[#18181B] hover:border-[#18181B]",
            ].join(" ")}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                onCategoryChange(selectedCategory === cat.slug ? "" : cat.slug)
              }
              className={[
                "text-xs px-3 py-1 rounded-full border transition-colors",
                selectedCategory === cat.slug
                  ? "bg-[#18181B] text-white border-[#18181B]"
                  : "border-[#E4E4E7] text-[#18181B] hover:border-[#18181B]",
              ].join(" ")}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] mb-2">
            Tag
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() =>
                  onTagChange(selectedTag === tag.slug ? "" : tag.slug)
                }
                className={[
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  selectedTag === tag.slug
                    ? "bg-red-600 text-white border-red-600"
                    : "border-[#E4E4E7] text-[#18181B] hover:border-red-600",
                ].join(" ")}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] mb-2">
          Rentang Waktu
        </p>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onDateChange(preset.value)}
              className={[
                "text-xs px-3 py-1 rounded-full border transition-colors",
                selectedDate === preset.value
                  ? "bg-[#18181B] text-white border-[#18181B]"
                  : "border-[#E4E4E7] text-[#18181B] hover:border-[#18181B]",
              ].join(" ")}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FilterPanel(props: FilterPanelProps) {
  return (
    <>
      <div className="hidden md:block">
        <FilterContent {...props} />
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal size={14} />
              Filter
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter Artikel</SheetTitle>
            </SheetHeader>
            <div className="mt-4 px-1">
              <FilterContent {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
