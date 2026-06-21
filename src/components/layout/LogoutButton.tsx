"use client"

import { useState } from "react"
import { logoutAction } from "@/actions/auth"

export default function LogoutButton() {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-zinc-500">Yakin?</span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm font-medium px-2.5 py-1.5 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 rounded transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ya, keluar
          </button>
        </form>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm px-2.5 py-1.5 text-zinc-500 hover:text-zinc-800 transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Batal
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm font-medium px-3 py-1.5 text-[#6B7280] hover:text-[#18181B] border border-[#E4E4E7] rounded transition-colors focus-visible:ring-2 focus-visible:ring-ring"
    >
      Keluar
    </button>
  )
}
