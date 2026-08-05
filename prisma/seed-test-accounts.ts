import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import { Role } from '../src/generated/prisma/enums'
import bcrypt from 'bcryptjs'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

function assertDevDatabase(rawUrl: string) {
  const expectedHostFragment = process.env.NEON_DEV_ENDPOINT_ID
  if (!expectedHostFragment) {
    throw new Error(
      'REFUSED: NEON_DEV_ENDPOINT_ID tidak di-set. Seeder ini menolak jalan tanpa whitelist host dev eksplisit.'
    )
  }
  let hostname: string
  try {
    hostname = new URL(rawUrl).hostname
  } catch {
    throw new Error('REFUSED: DATABASE_URL tidak valid, tidak bisa diverifikasi host-nya.')
  }
  if (!hostname.includes(expectedHostFragment)) {
    throw new Error(
      `REFUSED: DATABASE_URL host ("${hostname}") tidak cocok whitelist dev ("${expectedHostFragment}"). ` +
      `Seeder ini TIDAK akan pernah jalan di database yang tidak diverifikasi dev.`
    )
  }
  console.log(`  Host diverifikasi cocok whitelist dev: ${hostname}`)
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  if (process.env.ALLOW_TEST_SEED !== "true") {
    console.warn('⚠  seed-test-accounts requires ALLOW_TEST_SEED=true. Skipped.')
    console.warn('   In production, use seed-admin instead.')
    return
  }

  assertDevDatabase(process.env.DATABASE_URL!)

  const hash = await bcrypt.hash('password123', 10)

  const accounts = [
    { email: 'user@test.com',       name: 'Test User',       role: Role.USER       },
    { email: 'journalist@test.com', name: 'Test Journalist', role: Role.JOURNALIST },
    { email: 'editor@test.com',     name: 'Test Editor',     role: Role.EDITOR     },
    { email: 'admin@test.com',      name: 'Test Admin',      role: Role.ADMIN      },
  ]

  for (const acc of accounts) {
    await prisma.user.upsert({
      where: { email: acc.email },
      update: { role: acc.role },
      create: { email: acc.email, name: acc.name, passwordHash: hash, role: acc.role,
                profile: { create: {} } },
    })
    console.log(`  ${acc.role.padEnd(10)} -> ${acc.email}`)
  }

  console.log('\nPassword semua akun: password123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
