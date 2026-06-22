"use server"

import { signOut, auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { changePasswordSchema, type ChangePasswordInput } from "@/schemas/profile"

export async function logoutAction() {
  await signOut({ redirectTo: "/" })
}

export async function changePasswordAction(
  data: ChangePasswordInput
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = changePasswordSchema.safeParse(data)
  if (!parsed.success) return { error: "Data tidak valid" }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!user) return { error: "User tidak ditemukan" }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!isValid) return { error: "Password lama tidak sesuai" }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await db.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
    },
  })

  return {}
}
