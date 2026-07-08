"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profileSchema, type ProfileInput } from "@/schemas/profile"
import { verifyUploadedImage } from "@/lib/cloudinary-verify"

export async function updateProfileAction(
  data: ProfileInput & { avatarPublicId?: string },
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const { avatarPublicId, ...rest } = data
  const parsed = profileSchema.safeParse(rest)
  if (!parsed.success) return { error: "Data tidak valid" }

  const { name, bio, socialTwitter, socialLinkedin } = parsed.data
  let avatarUrl = parsed.data.avatarUrl

  const existingProfile = await db.profile.findUnique({
    where: { userId: session.user.id },
    select: { avatarUrl: true },
  })
  const currentAvatarUrl = existingProfile?.avatarUrl ?? ""

  // avatarUrl kosong (dihapus) atau tidak berubah dari yang sudah tersimpan → tidak perlu
  // re-verifikasi, tidak ada file baru yang diklaim. Hanya avatarUrl BARU yang wajib
  // datang bareng avatarPublicId hasil upload widget sesi ini.
  if (avatarUrl && avatarUrl !== currentAvatarUrl) {
    const verified = await verifyUploadedImage(avatarPublicId)
    if (!verified.ok) return { error: verified.reason }
    avatarUrl = verified.secureUrl
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name },
  })

  await db.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      avatarUrl: avatarUrl || null,
      bio: bio || null,
      socialTwitter: socialTwitter || null,
      socialLinkedin: socialLinkedin || null,
    },
    update: {
      avatarUrl: avatarUrl || null,
      bio: bio || null,
      socialTwitter: socialTwitter || null,
      socialLinkedin: socialLinkedin || null,
    },
  })

  revalidatePath("/dashboard/profile")
  return {}
}
