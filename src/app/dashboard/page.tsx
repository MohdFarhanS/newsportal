import type { Metadata } from "next"
import Link from "next/link"
import { auth } from "@/lib/auth"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Dashboard
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />
      <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900 mb-1">
        Selamat Datang,
      </h1>
      <p className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900 mb-8">
        {session?.user?.name}
      </p>

      <div className="border-t border-zinc-100 pt-6 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Pintasan</p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/dashboard/profile"
            className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            Edit Profil {"→"}
          </Link>
          <Link
            href="/dashboard/security"
            className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            Ganti Password {"→"}
          </Link>
        </div>
      </div>
    </div>
  )
}
