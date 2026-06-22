import { z } from "zod"
import { passwordSchema } from "@/schemas/auth"

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  bio: z.string().max(280, "Bio maks. 280 karakter").optional().or(z.literal("")),
  avatarUrl: z.string().url("URL tidak valid").optional().or(z.literal("")),
  socialTwitter: z.string().url("URL tidak valid").optional().or(z.literal("")),
  socialLinkedin: z.string().url("URL tidak valid").optional().or(z.literal("")),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Password minimal 8 karakter"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "Password baru tidak boleh sama dengan password lama",
    path: ["newPassword"],
  })

export type ProfileInput = z.infer<typeof profileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
