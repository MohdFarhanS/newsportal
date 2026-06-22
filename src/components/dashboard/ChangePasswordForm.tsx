"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { changePasswordSchema, type ChangePasswordInput } from "@/schemas/profile"
import { changePasswordAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const inputClass =
  "border-0 border-b border-zinc-300 rounded-none px-0 py-2.5 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-900 bg-transparent placeholder:text-zinc-300 text-sm"

export default function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) })

  async function onSubmit(data: ChangePasswordInput) {
    const result = await changePasswordAction(data)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Password berhasil diubah")
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="currentPassword"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Password Lama
        </label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClass}
          {...register("currentPassword")}
        />
        {errors.currentPassword && (
          <p className="text-[11px] text-red-600">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="newPassword"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Password Baru
        </label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 karakter, huruf & angka"
          className={inputClass}
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p className="text-[11px] text-red-600">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Konfirmasi Password Baru
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

      <div className="pt-1">
        <Button
          type="submit"
          className="w-full h-11 rounded-none text-[11px] uppercase tracking-[0.2em] font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Memproses..." : "Ubah Password →"}
        </Button>
      </div>
    </form>
  )
}