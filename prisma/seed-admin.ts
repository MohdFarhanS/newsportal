import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Role } from '../src/generated/prisma/enums'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const VALID_ROLES = Object.values(Role) as string[]

async function main() {
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME, SEED_ADMIN_ROLE } = process.env

  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD || !SEED_ADMIN_NAME) {
    console.error(`
Missing required env vars. Set these before running:

  SEED_ADMIN_EMAIL=admin@example.com
  SEED_ADMIN_PASSWORD=<min 8 chars>
  SEED_ADMIN_NAME="Admin Name"
  SEED_ADMIN_ROLE=ADMIN   # optional, default: ADMIN
`)
    process.exit(1)
  }

  if (SEED_ADMIN_PASSWORD.length < 8) {
    console.error('SEED_ADMIN_PASSWORD must be at least 8 characters.')
    process.exit(1)
  }

  const role = (SEED_ADMIN_ROLE?.toUpperCase() ?? 'ADMIN') as Role
  if (!VALID_ROLES.includes(role)) {
    console.error(`SEED_ADMIN_ROLE must be one of: ${VALID_ROLES.join(', ')}`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12)

  const user = await prisma.user.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: { name: SEED_ADMIN_NAME, role, passwordHash },
    create: {
      email: SEED_ADMIN_EMAIL,
      name: SEED_ADMIN_NAME,
      passwordHash,
      role,
      profile: { create: {} },
    },
    select: { id: true, email: true, role: true },
  })

  console.log(`✓ ${user.role} seeded: ${user.email} (id: ${user.id})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
