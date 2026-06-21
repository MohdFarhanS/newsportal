import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"
import { newPasswordSchema } from "@/schemas/auth"

const schema = z.object({
  token: z.string().min(1),
  newPassword: newPasswordSchema.shape.password,
})

const INVALID_TOKEN = {
  error: { code: "INVALID_TOKEN", message: "Link reset password tidak valid atau sudah kedaluwarsa." },
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Data tidak valid." } },
      { status: 400 }
    )
  }

  const { token, newPassword } = parsed.data

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true } } },
  })

  if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt < new Date()) {
    return NextResponse.json(INVALID_TOKEN, { status: 410 })
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  const now = new Date()

  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, passwordChangedAt: now },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    }),
  ])

  return NextResponse.json({ message: "Password berhasil direset. Silakan login." })
}
