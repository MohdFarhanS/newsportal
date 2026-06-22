"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { loginSchema, type LoginInput } from "@/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const inputClass =
  "border-0 border-b border-zinc-300 rounded-none px-0 py-2.5 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-900 bg-transparent placeholder:text-zinc-300 text-sm"

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    const result = await signIn("credentials", { ...data, redirect: false })
    if (result?.error) {
      setServerError("Email atau kata sandi salah.")
      return
    }
    const raw = searchParams.get("callbackUrl") ?? "/dashboard"
    const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard"
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
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

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Kata Sandi
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClass}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-[11px] text-red-600">{errors.password.message}</p>
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
          {isSubmitting ? "Memproses..." : "Masuk →"}
        </Button>
      </div>

      <div className="border-t border-zinc-100 pt-5 space-y-2">
        <p className="text-[12px] text-zinc-400">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            Daftar sekarang
          </Link>
        </p>
        <Link
          href="/forgot-password"
          className="block text-[12px] text-zinc-400 underline underline-offset-2 hover:text-zinc-700"
        >
          Lupa kata sandi?
        </Link>
      </div>
    </form>
  )
}
