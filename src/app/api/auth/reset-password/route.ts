import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { z } from "zod"
import { db } from "@/lib/db"
import { newPasswordSchema } from "@/schemas/auth"
import { getRateLimiter } from "@/lib/rate-limit"

const schema = z.object({
  token: z.string().min(1),
  newPassword: newPasswordSchema.shape.password,
})

const INVALID_TOKEN = {
  error: { code: "INVALID_TOKEN", message: "Link reset password tidak valid atau sudah kedaluwarsa." },
}

export async function POST(req: NextRequest) {
  const rl = getRateLimiter()
  if (rl) {
    const ip =
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown"
    const { success } = await rl.limit(`reset-password:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT", message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." } },
        { status: 429 }
      )
    }
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Data tidak valid." } },
      { status: 400 }
    )
  }

  const { token: rawToken, newPassword } = parsed.data
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token: tokenHash },
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
