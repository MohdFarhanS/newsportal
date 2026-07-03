"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function DeleteTaxonomyButton({
  kind,
  id,
  name,
}: {
  kind: "category" | "tag"
  id: string
  name: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const label = kind === "category" ? "kategori" : "tag"

  async function handleDelete() {
    if (!window.confirm(`Hapus ${label} "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setPending(true)
    try {
      const endpoint = kind === "category" ? `/api/categories/${id}` : `/api/tags/${id}`
      const res = await fetch(endpoint, { method: "DELETE" })
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
      onClick={handleDelete}
      disabled={pending}
      className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Menghapus..." : "Hapus"}
    </button>
  )
}
