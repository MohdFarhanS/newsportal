import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import LoginForm from "./login-form"

export const metadata: Metadata = { title: "Masuk" }

function getEdisiDate() {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(new Date())
    .toUpperCase()
}

type Props = { searchParams: Promise<{ reset?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth()
  if (session) redirect("/")

  const edisi = getEdisiDate()
  const { reset } = await searchParams

  return (
    <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-16 bg-background">
      <div className="w-full max-w-sm">
        {/* Editorial masthead */}
        <div className="mb-8">
          <div className="border-t border-zinc-200 mb-2" />
          <p className="font-heading text-[13px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
            NewsPortal
          </p>
          <div className="h-[3px] bg-red-600 mt-2 mb-6" />
          <h1 className="font-heading italic text-[44px] leading-[1.05] font-bold text-zinc-900">
            Selamat Datang
            <br />
            Kembali
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mt-3">
            {edisi}
          </p>
        </div>

        {reset === "success" && (
          <div className="bg-green-50 border border-green-200 rounded px-4 py-3 mb-6">
            <p className="text-[13px] text-green-800">
              Password berhasil direset. Silakan masuk dengan password baru kamu.
            </p>
          </div>
        )}

        <div className="border-t border-zinc-100 mb-7" />

        <LoginForm />
      </div>
    </main>
  )
}
