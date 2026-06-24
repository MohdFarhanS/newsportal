"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { clearReadingHistoryAction } from "@/actions/readingHistory"

export function ClearHistoryButton() {
  const [isPending, startTransition] = useTransition()

  function handleClear() {
    if (!window.confirm("Hapus seluruh riwayat baca? Tindakan ini tidak dapat dibatalkan.")) return
    startTransition(async () => {
      const result = await clearReadingHistoryAction()
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Riwayat baca dihapus")
      }
    })
  }

  return (
    <button
      onClick={handleClear}
      disabled={isPending}
      aria-busy={isPending}
      className="text-xs text-zinc-400 hover:text-red-600 underline underline-offset-2 transition-colors disabled:opacity-50"
    >
      {isPending ? "Menghapus..." : "Hapus Semua"}
    </button>
  )
}
