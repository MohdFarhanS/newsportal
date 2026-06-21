import type { Metadata } from "next"
import RegisterForm from "./register-form"

export const metadata: Metadata = { title: "Daftar" }

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

export default function RegisterPage() {
  const edisi = getEdisiDate()

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
            Bergabung
            <br />
            Bersama Kami
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mt-3">
            {edisi}
          </p>
        </div>

        <div className="border-t border-zinc-100 mb-7" />

        <RegisterForm />
      </div>
    </main>
  )
}
