"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { resetPasswordSchema, type ResetPasswordInput } from "@/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const inputClass =
  "border-0 border-b border-zinc-300 rounded-none px-0 py-2.5 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-900 bg-transparent placeholder:text-zinc-300 text-sm"

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  async function onSubmit(data: ResetPasswordInput) {
    setServerError(null)
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok && res.status !== 200) {
      const json = await res.json().catch(() => null)
      setServerError(json?.error?.message ?? "Terjadi kesalahan. Coba lagi.")
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="border-l-2 border-red-600 pl-4">
          <p className="text-sm text-zinc-700 leading-relaxed">
            Jika email tersebut terdaftar, kami telah mengirim link reset password.
            Periksa inbox kamu (termasuk folder spam).
          </p>
        </div>
        <p className="text-[12px] text-zinc-400">
          Link berlaku selama <strong>1 jam</strong>.
        </p>
        <div className="border-t border-zinc-100 pt-5">
          <Link
            href="/login"
            className="text-[12px] text-zinc-400 underline underline-offset-2 hover:text-zinc-700"
          >
            ← Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <p className="text-[13px] text-zinc-500 leading-relaxed -mt-2">
        Masukkan email kamu dan kami akan mengirim link untuk membuat password baru.
      </p>

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          className={inputClass}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-[11px] text-red-600">{errors.email.message}</p>
        )}
      </div>

      {serverError && (
        <p className="text-[11px] text-red-600 uppercase tracking-[0.1em]">
          {serverError}
        </p>
      )}

      <div className="pt-1">
        <Button
          type="submit"
          className="w-full h-11 rounded-none text-[11px] uppercase tracking-[0.2em] font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Mengirim..." : "Kirim Link Reset →"}
        </Button>
      </div>

      <div className="border-t border-zinc-100 pt-5">
        <Link
          href="/login"
          className="text-[12px] text-zinc-400 underline underline-offset-2 hover:text-zinc-700"
        >
          ← Kembali ke halaman masuk
        </Link>
      </div>
    </form>
  )
}
