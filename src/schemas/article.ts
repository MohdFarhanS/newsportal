import { z } from "zod"

export const articleSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(150, "Judul maksimal 150 karakter"),
  categoryId: z.string().min(1, "Pilih kategori"),
  tags: z.array(z.string()),
  excerpt: z.string().min(10, "Ringkasan minimal 10 karakter").max(160, "Ringkasan maksimal 160 karakter"),
  content: z.string().min(1, "Konten tidak boleh kosong"),
  coverImageUrl: z
    .string()
    .url("URL tidak valid")
    .refine((u) => u.startsWith("https://"), "URL harus HTTPS")
    .optional()
    .or(z.literal("")),
})

export type ArticleInput = z.infer<typeof articleSchema>

export const saveDraftSchema = articleSchema.partial()
export type SaveDraftInput = z.infer<typeof saveDraftSchema>
