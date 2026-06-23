import { cache } from "react"
import { db } from "@/lib/db"

export const getAuthorById = cache(async (id: string) => {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      profile: {
        select: {
          avatarUrl: true,
          bio: true,
          socialTwitter: true,
          socialLinkedin: true,
        },
      },
    },
  })
})
