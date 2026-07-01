import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { revalidateTag } from "next/cache"
import { Prisma } from "@/generated/prisma/client"
import { db } from "@/lib/db"
import { registerSchema } from "@/schemas/auth"
import { getRateLimiter } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const rl = getRateLimiter()
  if (rl) {
    const ip =
      req.headers.get("x-real-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown"
    const { success } = await rl.limit(`register:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT", message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." } },
        { status: 429 }
      )
    }
  }

  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Data tidak valid." } },
      { status: 400 }
    )
  }

  const { name, email, password } = parsed.data

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return NextResponse.json(
      { error: { code: "EMAIL_EXISTS", message: "Email sudah terdaftar." } },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "USER",
        profile: { create: {} },
      },
    })
  } catch (e) {
    // Handles TOCTOU: two concurrent requests with same email both pass findUnique,
    // second create hits unique constraint — return clean 409 instead of 500.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: { code: "EMAIL_EXISTS", message: "Email sudah terdaftar." } },
        { status: 409 }
      )
    }
    throw e
  }

  // Only bust the user chart cache — registration does not affect article analytics.
  revalidateTag("analytics-users")

  return NextResponse.json({ message: "Registrasi berhasil." }, { status: 201 })
}
