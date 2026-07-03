import { z } from "zod"

const slugPattern = /^[a-z0-9-]+$/

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(50, "Nama maksimal 50 karakter"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug minimal 2 karakter")
    .max(60, "Slug maksimal 60 karakter")
    .regex(slugPattern, "Slug hanya boleh huruf kecil, angka, dan tanda hubung"),
  description: z.string().max(280, "Deskripsi maksimal 280 karakter").optional().or(z.literal("")),
})
export type CategoryInput = z.infer<typeof categorySchema>

export const tagSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(30, "Nama maksimal 30 karakter"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug minimal 2 karakter")
    .max(40, "Slug maksimal 40 karakter")
    .regex(slugPattern, "Slug hanya boleh huruf kecil, angka, dan tanda hubung"),
})
export type TagInput = z.infer<typeof tagSchema>
