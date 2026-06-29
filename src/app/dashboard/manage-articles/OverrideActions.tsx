"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { ArticleStatus } from "@/generated/prisma/client"

const STATUS_OPTIONS: { value: ArticleStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "REVIEW", label: "Review" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PUBLISHED", label: "Published" },
]

function getMinDatetime(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 1)
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  )
}

export default function OverrideActions({
  articleId,
  currentStatus,
}: {
  articleId: string
  currentStatus: ArticleStatus
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<ArticleStatus>(currentStatus)
  const [note, setNote] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")

  // Re-seed status to latest prop whenever dialog opens (fixes stale useState after router.refresh)
  useEffect(() => {
    if (open) setStatus(currentStatus)
  }, [open, currentStatus])

  function reset() {
    setStatus(currentStatus)
    setNote("")
    setScheduledAt("")
  }

  function close() {
    setOpen(false)
    reset()
  }

  const isValid =
    (status !== "REJECTED" || note.trim().length > 0) &&
    (status !== "SCHEDULED" || !!scheduledAt)

  async function handleConfirm() {
    if (!isValid) return
    setPending(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "REJECTED" && { rejectionNote: note }),
          ...(status === "SCHEDULED" && {
            scheduledAt: new Date(scheduledAt).toISOString(),
          }),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error?.message ?? "Terjadi kesalahan.")
        return
      }
      toast.success(data.message)
      close()
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-300 hover:text-zinc-900 hover:border-zinc-500 pb-0.5 transition-colors"
      >
        Override
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) close() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading italic">Override Status Artikel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              Status saat ini: <span className="font-medium">{STATUS_OPTIONS.find(o => o.value === currentStatus)?.label ?? currentStatus}</span>
            </p>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ArticleStatus)}
              className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {status === "SCHEDULED" && (
              <input
                type="datetime-local"
                value={scheduledAt}
                min={getMinDatetime()}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
              />
            )}

            {status === "REJECTED" && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan penolakan (wajib)..."
                rows={4}
                maxLength={2000}
                className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 resize-none"
              />
            )}
          </div>
          <DialogFooter>
            <button
              onClick={close}
              className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid || pending}
              className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
            >
              {pending ? "Memproses..." : "Konfirmasi Override"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}