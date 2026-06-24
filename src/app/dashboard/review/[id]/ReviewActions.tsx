"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function ReviewActions({ articleId }: { articleId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState<"approve" | "reject" | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [note, setNote] = useState("")

  async function callApi(action: "approve" | "reject", noteText?: string): Promise<boolean> {
    setPending(action)
    try {
      const res = await fetch(`/api/articles/${articleId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(noteText && { note: noteText }) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error?.message ?? "Terjadi kesalahan.")
        return false
      }
      toast.success(data.message)
      router.push("/dashboard/review")
      return true
    } finally {
      setPending(null)
    }
  }

  async function handleRejectConfirm() {
    if (!note.trim()) return
    setRejectOpen(false)
    const success = await callApi("reject", note)
    if (success) setNote("")
  }

  return (
    <>
      <button
        onClick={() => callApi("approve")}
        disabled={!!pending}
        className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
      >
        {pending === "approve" ? "Memproses..." : "Setujui"}
      </button>
      <button
        onClick={() => setRejectOpen(true)}
        disabled={!!pending}
        className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 border border-red-300 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-50 transition-colors"
      >
        {pending === "reject" ? "Memproses..." : "Tolak"}
      </button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading italic">Tolak Artikel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              Berikan catatan untuk penulis agar dapat memperbaiki artikel.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan penolakan (wajib)..."
              rows={4}
              maxLength={2000}
              className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 resize-none"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => { setRejectOpen(false); setNote("") }}
              className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleRejectConfirm}
              disabled={!note.trim() || !!pending}
              className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 border border-red-300 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-50 transition-colors"
            >
              Konfirmasi Tolak
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
