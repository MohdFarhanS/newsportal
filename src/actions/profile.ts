"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profileSchema, type ProfileInput } from "@/schemas/profile"

export async function updateProfileAction(data: ProfileInput): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = profileSchema.safeParse(data)
  if (!parsed.success) return { error: "Data tidak valid" }

  const { name, bio, avatarUrl, socialTwitter, socialLinkedin } = parsed.data

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
