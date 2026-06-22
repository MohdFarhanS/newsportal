import { z } from "zod"

export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .regex(/[a-zA-Z]/, "Password harus mengandung huruf")
  .regex(/[0-9]/, "Password harus mengandung angka")

export const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.email("Email tidak valid"),
  password: passwordSchema,
})

export const resetPasswordSchema = z.object({
  email: z.email("Email tidak valid"),
})

export const newPasswordSchema = z.object({
  password: passwordSchema,
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type NewPasswordInput = z.infer<typeof newPasswordSchema>
