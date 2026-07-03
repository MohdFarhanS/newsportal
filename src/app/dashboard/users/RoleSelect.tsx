"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateUserRoleAction } from "@/actions/users"
import type { Role } from "@/generated/prisma/client"

const ROLES: Role[] = ["USER", "JOURNALIST", "EDITOR", "ADMIN"]

export default function RoleSelect({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string
  currentRole: Role
  isSelf: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleChange(role: Role) {
    if (role === currentRole) return
    if (!window.confirm(`Ubah role menjadi ${role}?`)) return
    startTransition(async () => {
      const result = await updateUserRoleAction({ userId, role })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Role diperbarui.")
        router.refresh()
      }
    })
  }

  return (
    <select
      defaultValue={currentRole}
      disabled={isSelf || isPending}
      onChange={(e) => handleChange(e.target.value as Role)}
      className="text-sm border border-zinc-200 rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  )
}
