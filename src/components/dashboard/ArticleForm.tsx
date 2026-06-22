"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import slugify from "slugify"
import { toast } from "sonner"
import { articleSchema, type ArticleInput } from "@/schemas/article"
import {
  createArticleAction,
  updateArticleAction,
  saveDraftAction,
  submitForReviewAction,
} from "@/actions/article"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { UploadWidget } from "@/components/ui/upload-widget"
import TiptapEditor from "@/components/dashboard/TiptapEditor"
import type { ArticleForEdit } from "@/lib/cms-articles"
import type { CloudinaryUploadWidgetResults } from "next-cloudinary"

type Category = { id: string; name: string; slug: string }
type Tag = { id: string; name: string; slug: string }

type Props = {
  initialData?: ArticleForEdit | null
  categories: Category[]
  tags: Tag[]
}

const LABEL = "text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-1"
const INPUT =
  "w-full bg-transparent border-b border-zinc-200 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 transition-colors"

export default function ArticleForm({ initialData, categories, tags }: Props) {
  const router = useRouter()
  const isEdit = !!initialData
  const canEdit =
    !isEdit || initialData.status === "DRAFT" || initialData.status === "REJECTED"

  const defaultTagIds = initialData?.tags.map((at) => at.tag.id) ?? []

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ArticleInput>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      categoryId: initialData?.categoryId ?? "",
      tags: defaultTagIds,
      excerpt: initialData?.excerpt ?? "",
      content: initialData?.content ?? "",
      coverImageUrl: initialData?.coverImageUrl ?? "",
    },
  })

  // Slug preview
  const title = watch("title")
  const debouncedTitle = useDebounce(title, 400)
  const slugPreview = slugify(debouncedTitle || "", { lower: true, strict: true })

  // Autosave for DRAFT articles (edit mode only)
  const formValues = watch()
  const debouncedValues = useDebounce(formValues, 10000)
  const skipFirstRender = useRef(true)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")

  useEffect(() => {
    if (skipFirstRender.current) {
      skipFirstRender.current = false
      return
    }
    if (!initialData?.id || initialData.status !== "DRAFT") return

    setAutoSaveStatus("saving")
    saveDraftAction(initialData.id, debouncedValues).then(() => {
      setAutoSaveStatus("saved")
      setTimeout(() => setAutoSaveStatus("idle"), 2000)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValues])

  // Cover image state (managed separately from RHF so UploadWidget result feeds in)
  const [coverPreview, setCoverPreview] = useState(initialData?.coverImageUrl ?? "")

  const handleCoverUpload = (result: CloudinaryUploadWidgetResults) => {
    if (result.event !== "success") return
    const info = result.info as { secure_url: string }
    setValue("coverImageUrl", info.secure_url)
    setCoverPreview(info.secure_url)
  }

  const onSaveDraft = handleSubmit(async (data) => {
    if (isEdit) {
      const res = await updateArticleAction(initialData.id, data)
      if (res.error) return toast.error(res.error)
      toast.success("Artikel disimpan")
    } else {
      const res = await createArticleAction(data)
      if (res.error) return toast.error(res.error)
      router.push(`/dashboard/articles/${res.id}/edit`)
    }
  })

  const onSubmitReview = async () => {
    if (!initialData?.id) return
    const res = await submitForReviewAction(initialData.id)
    if (res.error) return toast.error(res.error)
    toast.success("Artikel dikirim ke redaksi")
    router.push("/dashboard/articles")
  }

  return (
    <div className="space-y-6">
      {/* Rejection note banner */}
      {initialData?.status === "REJECTED" && initialData.rejectionNote && (
        <div className="border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-red-500 mb-1">
            Catatan Penolakan
          </p>
          <p className="text-sm text-red-700">{initialData.rejectionNote}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label className={LABEL}>Judul *</label>
        <input
          {...register("title")}
          disabled={!canEdit}
          placeholder="Judul artikel"
          className={INPUT}
        />
        {slugPreview && (
          <p className="mt-1 text-[11px] text-zinc-400">
            slug: <span className="font-mono">{slugPreview}</span>
          </p>
        )}
        {errors.title && (
          <p className="mt-1 text-[11px] text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Category + Tags row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className={LABEL}>Kategori *</label>
          <select
            {...register("categoryId")}
            disabled={!canEdit}
            className={INPUT}
          >
            <option value="">Pilih kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-[11px] text-red-500">{errors.categoryId.message}</p>
          )}
        </div>

        <div>
          <label className={LABEL}>Tag</label>
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  value={tag.id}
                  disabled={!canEdit}
                  defaultChecked={defaultTagIds.includes(tag.id)}
                  onChange={(e) => {
                    const current = watch("tags") ?? []
                    setValue(
                      "tags",
                      e.target.checked
                        ? [...current, tag.id]
                        : current.filter((id) => id !== tag.id),
                    )
                  }}
                  className="accent-red-600"
                />
                <span className="text-xs text-zinc-600">{tag.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label className={LABEL}>
          Ringkasan * <span className="normal-case tracking-normal">(maks. 160 karakter)</span>
        </label>
        <textarea
          {...register("excerpt")}
          disabled={!canEdit}
          rows={2}
          placeholder="Ringkasan singkat artikel untuk listing dan SEO"
          className={`${INPUT} resize-none`}
        />
        {errors.excerpt && (
          <p className="mt-1 text-[11px] text-red-500">{errors.excerpt.message}</p>
        )}
      </div>

      {/* Cover image */}
      <div>
        <label className={LABEL}>Foto Sampul</label>
        {coverPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPreview}
            alt="Cover preview"
            className="mb-2 max-h-48 max-w-full rounded-sm"
          />
        )}
        {canEdit && (
          <UploadWidget
            uploadPreset="newsportal_covers"
            options={{ multiple: false, sources: ["local", "url", "camera"] }}
            onSuccess={handleCoverUpload}
          >
            {({ open }) => (
              <button
                type="button"
                onClick={() => open()}
                className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 border-b border-zinc-300 hover:text-zinc-900 hover:border-zinc-500 pb-0.5 transition-colors"
              >
                {coverPreview ? "Ganti Foto" : "Upload Foto"}
              </button>
            )}
          </UploadWidget>
        )}
      </div>

      {/* Content */}
      <div>
        <label className={LABEL}>Konten *</label>
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <TiptapEditor
              value={field.value}
              onChange={field.onChange}
              disabled={!canEdit}
            />
          )}
        />
        {errors.content && (
          <p className="mt-1 text-[11px] text-red-500">{errors.content.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
        <div className="flex gap-3">
          {canEdit && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSubmitting}
              className="text-[11px] uppercase tracking-[0.15em] bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Draft"}
            </button>
          )}
          {isEdit && (initialData.status === "DRAFT" || initialData.status === "REJECTED") && (
            <button
              type="button"
              onClick={onSubmitReview}
              disabled={isSubmitting}
              className="text-[11px] uppercase tracking-[0.15em] border border-zinc-900 text-zinc-900 px-4 py-2 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Submit Review
            </button>
          )}
        </div>

        {autoSaveStatus !== "idle" && (
          <p className="text-[11px] text-zinc-400">
            {autoSaveStatus === "saving" ? "Menyimpan otomatis..." : "Tersimpan"}
          </p>
        )}
      </div>
    </div>
  )
}
