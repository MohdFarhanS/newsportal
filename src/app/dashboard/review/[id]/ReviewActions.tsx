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

function getMinDatetime(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 1)
  // datetime-local input requires "YYYY-MM-DDThh:mm" in LOCAL time (not UTC)
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  )
}

export default function ReviewActions({ articleId }: { articleId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState<"approve" | "reject" | "schedule" | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [note, setNote] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")

  async function callApi(
    action: "approve" | "reject" | "schedule",
    extra?: { note?: string; scheduledAt?: string }
  ): Promise<boolean> {
    setPending(action)
    try {
      const res = await fetch(`/api/articles/${articleId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
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

  async function handleApproveConfirm() {
    setApproveOpen(false)
    await callApi("approve")
  }

  async function handleRejectConfirm() {
    if (!note.trim()) return
    setRejectOpen(false)
    const success = await callApi("reject", { note })
    if (success) setNote("")
  }

  function closeScheduleDialog() {
    setScheduleOpen(false)
    setScheduledAt("")
  }

  async function handleScheduleConfirm() {
    if (!scheduledAt) return
    const isoValue = new Date(scheduledAt).toISOString()
    closeScheduleDialog()
    await callApi("schedule", { scheduledAt: isoValue })
  }

  return (
    <>
      <button
        onClick={() => setApproveOpen(true)}
        disabled={!!pending}
        className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
      >
        {pending === "approve" ? "Memproses..." : "Setujui"}
      </button>
      <button
        onClick={() => setScheduleOpen(true)}
        disabled={!!pending}
        className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 border border-zinc-300 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
      >
        {pending === "schedule" ? "Memproses..." : "Jadwalkan"}
      </button>
      <button
        onClick={() => setRejectOpen(true)}
        disabled={!!pending}
        className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 border border-red-300 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-50 transition-colors"
      >
        {pending === "reject" ? "Memproses..." : "Tolak"}
      </button>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading italic">Setujui Artikel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              Artikel akan langsung dipublikasikan ke halaman publik. Lanjutkan?
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setApproveOpen(false)}
              className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleApproveConfirm}
              disabled={!!pending}
              className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
            >
              Konfirmasi Setujui
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={(open) => { if (!open) closeScheduleDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading italic">Jadwalkan Publikasi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              Pilih waktu artikel akan dipublikasikan secara otomatis.
            </p>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={getMinDatetime()}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
            />
          </div>
          <DialogFooter>
            <button
              onClick={closeScheduleDialog}
              className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleScheduleConfirm}
              disabled={!scheduledAt || !!pending}
              className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
            >
              Konfirmasi Jadwal
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
