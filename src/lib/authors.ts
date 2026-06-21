import { db } from "@/lib/db"

export async function getAuthorById(id: string) {
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
}
