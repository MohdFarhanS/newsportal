"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import slugify from "slugify"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type Kind = "category" | "tag"

interface TaxonomyFormProps {
  kind: Kind
  mode: "create" | "edit"
  initial?: { id: string; name: string; slug: string; description?: string | null }
}

export default function TaxonomyForm({ kind, mode, initial }: TaxonomyFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [name, setName] = useState(initial?.name ?? "")
  const [slug, setSlug] = useState(initial?.slug ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [slugTouched, setSlugTouched] = useState(mode === "edit")

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(name, { lower: true, strict: true }))
    }
  }, [name, slugTouched])

  function reset() {
    setName(initial?.name ?? "")
    setSlug(initial?.slug ?? "")
    setDescription(initial?.description ?? "")
    setSlugTouched(mode === "edit")
  }

  function close() {
    setOpen(false)
    reset()
  }

  const label = kind === "category" ? "Kategori" : "Tag"
  const endpoint =
    kind === "category"
      ? mode === "edit"
        ? `/api/categories/${initial?.id}`
        : "/api/categories"
      : mode === "edit"
        ? `/api/tags/${initial?.id}`
        : "/api/tags"

  async function handleSubmit() {
    setPending(true)
    try {
      const res = await fetch(endpoint, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "category" ? { name, slug, description } : { name, slug }
        ),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error?.message ?? "Terjadi kesalahan.")
        return
      }
      toast.success(mode === "edit" ? `${label} diperbarui.` : `${label} ditambahkan.`)
      close()
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const isValid = name.trim().length >= 2 && slug.trim().length >= 2

  return (
    <>
      {mode === "create" ? (
        <button
          onClick={() => setOpen(true)}
          className="text-[11px] uppercase tracking-[0.15em] px-3 py-1.5 border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          + Tambah {label}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-300 hover:text-zinc-900 hover:border-zinc-500 pb-0.5 transition-colors"
        >
          Edit
        </button>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) close() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading italic">
              {mode === "edit" ? `Edit ${label}` : `Tambah ${label}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-zinc-400 mb-1">
                Nama
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-zinc-400 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400"
              />
            </div>
            {kind === "category" && (
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-zinc-400 mb-1">
                  Deskripsi (opsional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={280}
                  className="w-full border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 resize-none"
                />
              </div>
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
              onClick={handleSubmit}
              disabled={!isValid || pending}
              className="text-[11px] uppercase tracking-[0.15em] px-4 py-2 bg-zinc-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
            >
              {pending ? "Menyimpan..." : "Simpan"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
