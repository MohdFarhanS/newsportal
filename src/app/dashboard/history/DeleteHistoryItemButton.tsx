"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
import { deleteReadingHistoryItemAction } from "@/actions/readingHistory"

export function DeleteHistoryItemButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteReadingHistoryItemAction(id)
        toast.success("Artikel dihapus dari riwayat")
      } catch {
        toast.error("Gagal menghapus artikel")
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      aria-busy={isPending}
      aria-label="Hapus dari riwayat"
      className="mt-1 p-1 text-zinc-300 hover:text-zinc-600 transition-colors flex-shrink-0 disabled:opacity-50"
    >
      <X className="size-4" />
    </button>
  )
}
