import { db } from "@/lib/db"
import type { Role } from "@/generated/prisma/client"

export async function getAllUsersAdmin(page = 1, perPage = 20, role?: Role) {
  const where = role ? { role } : {}
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    }),
    db.user.count({ where }),
  ])
  return { users, total, totalPages: Math.ceil(total / perPage) }
}
