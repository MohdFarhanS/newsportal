import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db"
import { resetPasswordSchema } from "@/schemas/auth"
import { getRateLimiter } from "@/lib/rate-limit"
import { sendPasswordResetEmail } from "@/lib/email"

const OK = { message: "Jika email terdaftar, link reset password telah dikirim." }

export async function POST(req: NextRequest) {
  const rl = getRateLimiter()
  if (rl) {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1"
    const { success } = await rl.limit(`forgot-password:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT", message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." } },
        { status: 429 }
      )
    }
  }

  const body = await req.json().catch(() => null)
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Email tidak valid." } },
      { status: 400 }
    )
  }

  const { email } = parsed.data
  const user = await db.user.findUnique({ where: { email }, select: { id: true } })

  // ponytail: always 200 regardless of whether email exists — prevent enumeration
  if (!user) return NextResponse.json(OK)

  // Clean up any unused previous tokens
  await db.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  })

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  await sendPasswordResetEmail(email, token)

  return NextResponse.json(OK)
}
