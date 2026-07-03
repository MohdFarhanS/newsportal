"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateUserRoleSchema, setUserActiveSchema, type UpdateUserRoleInput, type SetUserActiveInput } from "@/schemas/users"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" as const }
  if (session.user.role !== "ADMIN") return { error: "Forbidden" as const }
  return { session }
}

export async function updateUserRoleAction(data: UpdateUserRoleInput): Promise<{ error?: string }> {
  const result = await requireAdmin()
  if ("error" in result) return { error: result.error }
  const { session } = result

  const parsed = updateUserRoleSchema.safeParse(data)
  if (!parsed.success) return { error: "Data tidak valid" }

  // Cegah admin mengubah role akun sendiri — mencegah lockout tidak sengaja.
  if (parsed.data.userId === session.user.id) {
    return { error: "Tidak dapat mengubah role akun sendiri" }
  }

  // updateMany untuk TOCTOU safety — count=0 jika user sudah tidak ada saat race.
  const updated = await db.user.updateMany({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  })
  if (updated.count === 0) return { error: "Pengguna tidak ditemukan" }

  revalidatePath("/dashboard/users")
  return {}
}

export async function setUserActiveAction(data: SetUserActiveInput): Promise<{ error?: string }> {
  const result = await requireAdmin()
  if ("error" in result) return { error: result.error }
  const { session } = result

  const parsed = setUserActiveSchema.safeParse(data)
  if (!parsed.success) return { error: "Data tidak valid" }

  // Cegah admin menonaktifkan akun sendiri — FR-AUTH-07 akan langsung mencabut sesi ini juga.
  if (parsed.data.userId === session.user.id) {
    return { error: "Tidak dapat menonaktifkan akun sendiri" }
  }

  // updateMany untuk TOCTOU safety — count=0 jika user sudah tidak ada saat race.
  const updated = await db.user.updateMany({
    where: { id: parsed.data.userId },
    data: { isActive: parsed.data.isActive },
  })
  if (updated.count === 0) return { error: "Pengguna tidak ditemukan" }

  revalidatePath("/dashboard/users")
  return {}
}
