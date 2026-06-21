"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { newPasswordSchema } from "@/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ponytail: confirmPassword is client-only, not sent to server
const formSchema = newPasswordSchema
  .extend({ confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  })

type FormData = z.infer<typeof formSchema>

const inputClass =
  "border-0 border-b border-zinc-300 rounded-none px-0 py-2.5 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-900 bg-transparent placeholder:text-zinc-300 text-sm"

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(formSchema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    setTokenError(null)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: data.password }),
    })

    if (res.status === 410) {
      setTokenError("Link reset password tidak valid atau sudah kedaluwarsa.")
      return
    }
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      setServerError(json?.error?.message ?? "Terjadi kesalahan. Coba lagi.")
      return
    }

    window.location.href = "/login?reset=success"
  }

  if (tokenError) {
    return (
      <div className="space-y-5">
        <div className="border-l-2 border-red-600 pl-4">
          <p className="text-sm text-zinc-700 leading-relaxed">{tokenError}</p>
        </div>
        <div className="border-t border-zinc-100 pt-5">
          <Link
            href="/forgot-password"
            className="text-[12px] text-zinc-400 underline underline-offset-2 hover:text-zinc-700"
          >
            Minta link reset baru →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <p className="text-[13px] text-zinc-500 leading-relaxed -mt-2">
        Password minimal 8 karakter dan harus mengandung huruf dan angka.
      </p>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Password Baru
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClass}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-[11px] text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Konfirmasi Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className={inputClass}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-[11px] text-red-600">{errors.confirmPassword.message}</p>
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
          {isSubmitting ? "Menyimpan..." : "Simpan Password Baru →"}
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
