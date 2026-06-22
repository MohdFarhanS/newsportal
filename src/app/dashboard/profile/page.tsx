import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import ProfileForm from "@/components/dashboard/ProfileForm"

export const metadata: Metadata = { title: "Edit Profil" }

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id

  const [user, profile] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    db.profile.findUnique({ where: { userId } }),
  ])

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Akun Saya
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />
      <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900 mb-1">
        Edit Profil
      </h1>
      <p className="text-[12px] text-zinc-400 mb-8">{user?.email}</p>

      <ProfileForm
        initialValues={{
          name: user?.name ?? "",
          bio: profile?.bio ?? "",
          avatarUrl: profile?.avatarUrl ?? "",
          socialTwitter: profile?.socialTwitter ?? "",
          socialLinkedin: profile?.socialLinkedin ?? "",
        }}
      />
    </div>
  )
}
