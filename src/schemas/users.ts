import { z } from "zod"

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "JOURNALIST", "EDITOR", "ADMIN"]),
})
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>

export const setUserActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
})
export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>
