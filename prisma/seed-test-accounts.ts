import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Role } from '../src/generated/prisma/enums'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
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
