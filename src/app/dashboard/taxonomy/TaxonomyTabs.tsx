"use client"

import { useState } from "react"
import TaxonomyForm from "./TaxonomyForm"
import DeleteTaxonomyButton from "./DeleteTaxonomyButton"

type CategoryItem = {
  id: string
  name: string
  slug: string
  description: string | null
  _count: { articles: number }
}

type TagItem = {
  id: string
  name: string
  slug: string
  _count: { articles: number }
}

export default function TaxonomyTabs({
  categories,
  tags,
}: {
  categories: CategoryItem[]
  tags: TagItem[]
}) {
  const [tab, setTab] = useState<"category" | "tag">("category")

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab("category")}
          className={`text-[11px] uppercase tracking-[0.15em] px-3 py-1.5 border transition-colors ${
            tab === "category"
              ? "border-zinc-900 text-zinc-900 bg-zinc-100"
              : "border-zinc-300 text-zinc-500 hover:bg-zinc-50"
          }`}
        >
          Kategori ({categories.length})
        </button>
        <button
          onClick={() => setTab("tag")}
          className={`text-[11px] uppercase tracking-[0.15em] px-3 py-1.5 border transition-colors ${
            tab === "tag"
              ? "border-zinc-900 text-zinc-900 bg-zinc-100"
              : "border-zinc-300 text-zinc-500 hover:bg-zinc-50"
          }`}
        >
          Tag ({tags.length})
        </button>
      </div>

      {tab === "category" ? (
        <div>
          <div className="flex items-center justify-end mb-4">
            <TaxonomyForm kind="category" mode="create" />
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-zinc-400">Belum ada kategori.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {categories.map((cat) => (
                <div key={cat.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{cat.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">/{cat.slug}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm font-medium text-zinc-500 bg-zinc-100">
                      {cat._count.articles} artikel
                    </span>
                    <TaxonomyForm kind="category" mode="edit" initial={cat} />
                    <DeleteTaxonomyButton kind="category" id={cat.id} name={cat.name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-end mb-4">
            <TaxonomyForm kind="tag" mode="create" />
          </div>
          {tags.length === 0 ? (
            <p className="text-sm text-zinc-400">Belum ada tag.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {tags.map((tag) => (
                <div key={tag.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{tag.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">/{tag.slug}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm font-medium text-zinc-500 bg-zinc-100">
                      {tag._count.articles} artikel
                    </span>
                    <TaxonomyForm kind="tag" mode="edit" initial={tag} />
                    <DeleteTaxonomyButton kind="tag" id={tag.id} name={tag.name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
