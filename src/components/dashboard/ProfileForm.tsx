"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import Image from "next/image"
import { profileSchema, type ProfileInput } from "@/schemas/profile"
import { updateProfileAction } from "@/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UploadWidget } from "@/components/ui/upload-widget"

const inputClass =
  "border-0 border-b border-zinc-300 rounded-none px-0 py-2.5 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-zinc-900 bg-transparent placeholder:text-zinc-300 text-sm"

type Props = {
  initialValues: {
    name: string
    bio: string
    avatarUrl: string
    socialTwitter: string
    socialLinkedin: string
  }
}

export default function ProfileForm({ initialValues }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatarUrl)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialValues.name,
      bio: initialValues.bio,
      socialTwitter: initialValues.socialTwitter,
      socialLinkedin: initialValues.socialLinkedin,
    },
  })

  async function onSubmit(data: ProfileInput) {
    const result = await updateProfileAction({ ...data, avatarUrl })
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Profil berhasil diperbarui")
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md" noValidate>
      {/* Avatar */}
      <div className="space-y-3">
        <p className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400">
          Foto Profil
        </p>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={64}
              height={64}
              className="rounded-full object-cover w-16 h-16"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
              Foto
            </div>
          )}
          <UploadWidget
            uploadPreset="newsportal_avatars"
            options={{ cropping: true, croppingAspectRatio: 1 }}
            onSuccess={(result) => {
              if (
                result.info &&
                typeof result.info === "object" &&
                "secure_url" in result.info
              ) {
                setAvatarUrl(result.info.secure_url as string)
              }
            }}
          >
            {({ open }) => (
              <button
                type="button"
                onClick={() => open()}
                className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 border border-zinc-200 px-3 py-1.5 hover:border-zinc-400 transition-colors"
              >
                {avatarUrl ? "Ganti Foto" : "Upload Foto"}
              </button>
            )}
          </UploadWidget>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Nama Lengkap
        </label>
        <Input id="name" type="text" autoComplete="name" className={inputClass} {...register("name")} />
        {errors.name && <p className="text-[11px] text-red-600">{errors.name.message}</p>}
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label
          htmlFor="bio"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Bio{" "}
          <span className="normal-case tracking-normal text-zinc-300">(maks. 280 karakter)</span>
        </label>
        <textarea
          id="bio"
          rows={3}
          className="w-full border-0 border-b border-zinc-300 rounded-none px-0 py-2.5 shadow-none focus:outline-none focus:border-zinc-900 bg-transparent placeholder:text-zinc-300 text-sm resize-none"
          placeholder="Ceritakan sedikit tentang dirimu..."
          {...register("bio")}
        />
        {errors.bio && <p className="text-[11px] text-red-600">{errors.bio.message}</p>}
      </div>

      {/* Twitter */}
      <div className="space-y-1.5">
        <label
          htmlFor="socialTwitter"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          Twitter / X
        </label>
        <Input
          id="socialTwitter"
          type="url"
          placeholder="https://x.com/username"
          className={inputClass}
          {...register("socialTwitter")}
        />
        {errors.socialTwitter && (
          <p className="text-[11px] text-red-600">{errors.socialTwitter.message}</p>
        )}
      </div>

      {/* LinkedIn */}
      <div className="space-y-1.5">
        <label
          htmlFor="socialLinkedin"
          className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400"
        >
          LinkedIn
        </label>
        <Input
          id="socialLinkedin"
          type="url"
          placeholder="https://linkedin.com/in/username"
          className={inputClass}
          {...register("socialLinkedin")}
        />
        {errors.socialLinkedin && (
          <p className="text-[11px] text-red-600">{errors.socialLinkedin.message}</p>
        )}
      </div>

      <div className="pt-1">
        <Button
          type="submit"
          className="w-full h-11 rounded-none text-[11px] uppercase tracking-[0.2em] font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Profil →"}
        </Button>
      </div>
    </form>
  )
}