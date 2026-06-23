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
    const ip =
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown"
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

  const rawToken = crypto.randomBytes(32).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordResetToken.create({
    data: { userId: user.id, token: tokenHash, expiresAt },
  })

  try {
    await sendPasswordResetEmail(email, rawToken)
  } catch (err) {
    console.error("[forgot-password] Failed to send email:", err)
    // Return OK anyway — prevents enumeration; token is valid if user retries
  }

  return NextResponse.json(OK)
}
