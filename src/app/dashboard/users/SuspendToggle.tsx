"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { setUserActiveAction } from "@/actions/users"

export default function SuspendToggle({
  userId,
  isActive,
  isSelf,
}: {
  userId: string
  isActive: boolean
  isSelf: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    if (isActive && !window.confirm("Nonaktifkan pengguna ini? Sesi aktif mereka akan langsung dicabut.")) {
      return
    }
    startTransition(async () => {
      const result = await setUserActiveAction({ userId, isActive: !isActive })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(isActive ? "Pengguna dinonaktifkan." : "Pengguna diaktifkan kembali.")
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isSelf || isPending}
      className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 border rounded-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
        isActive
          ? "text-zinc-500 border-zinc-200 hover:text-red-600 hover:border-red-300"
          : "text-red-600 border-red-300 hover:bg-red-50"
      }`}
    >
      {isPending ? "Memproses..." : isActive ? "Nonaktifkan" : "Aktifkan"}
    </button>
  )
}
