import type { Metadata } from "next"
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm"

export const metadata: Metadata = { title: "Keamanan" }

export default function SecurityPage() {
  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Akun Saya
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />
      <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900 mb-1">
        Keamanan
      </h1>
      <p className="text-[12px] text-zinc-400 mb-8">
        Ganti password akun kamu. Password baru harus berbeda dari password lama.
      </p>

      <ChangePasswordForm />
    </div>
  )
}