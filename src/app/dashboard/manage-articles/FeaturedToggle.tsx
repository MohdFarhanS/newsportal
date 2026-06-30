"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function FeaturedToggle({
  articleId,
  isFeatured,
}: {
  articleId: string
  isFeatured: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleToggle() {
    setPending(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/feature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !isFeatured }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error?.message ?? "Terjadi kesalahan.")
        return
      }
      toast.success(data.message)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 border rounded-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
        isFeatured
          ? "text-amber-600 border-amber-300 hover:bg-amber-50"
          : "text-zinc-400 border-zinc-200 hover:text-zinc-600 hover:border-zinc-400"
      }`}
    >
      {isFeatured ? "★ Featured" : "☆ Featured"}
    </button>
  )
}
