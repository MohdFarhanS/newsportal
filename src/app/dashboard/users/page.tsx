import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getAllUsersAdmin } from "@/lib/users"
import { formatDistanceToNow } from "date-fns"
import { id as localeId } from "date-fns/locale"
import type { Role } from "@/generated/prisma/client"
import Pagination from "@/components/layout/Pagination"
import RoleSelect from "./RoleSelect"
import SuspendToggle from "./SuspendToggle"

export const metadata: Metadata = { title: "Pengguna" }

const ROLES: Role[] = ["USER", "JOURNALIST", "EDITOR", "ADMIN"]

function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value)
}

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; role?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const { page: pageParam, role: roleParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const role = isValidRole(roleParam) ? roleParam : undefined

  const { users, total, totalPages } = await getAllUsersAdmin(page, 20, role)

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Admin
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />

      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900">
          Pengguna
        </h1>
        <span className="text-sm text-zinc-400">{total} pengguna</span>
      </div>

      <form method="GET" className="mb-6 flex items-center gap-2">
        <select
          name="role"
          defaultValue={role ?? ""}
          className="text-sm border border-zinc-200 rounded px-2 py-1.5 text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">Semua Role</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="text-[11px] uppercase tracking-[0.15em] px-3 py-1.5 border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Filter
        </button>
        {role && (
          <Link
            href="/dashboard/users"
            className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Reset
          </Link>
        )}
      </form>

      {users.length === 0 ? (
        <div className="border-t border-zinc-100 pt-8 text-center">
          <p className="text-sm text-zinc-400">Tidak ada pengguna ditemukan.</p>
        </div>
      ) : (
        <>
          <div className="hidden lg:grid grid-cols-[1fr_auto_auto_auto] gap-4 pb-2 border-b border-zinc-200">
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400">Pengguna</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400">Role</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400">Status</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 text-right">Bergabung</span>
          </div>

          <div className="divide-y divide-zinc-100">
            {users.map((user) => {
              const isSelf = user.id === session.user.id
              return (
                <div
                  key={user.id}
                  className="flex flex-col gap-2 py-3 lg:grid lg:grid-cols-[1fr_auto_auto_auto] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {user.name}
                      {isSelf && (
                        <span className="ml-2 text-[10px] uppercase tracking-[0.1em] text-zinc-400">
                          (Akun Anda)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 lg:contents">
                    <RoleSelect userId={user.id} currentRole={user.role} isSelf={isSelf} />
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm font-medium ${
                          user.isActive ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                        }`}
                      >
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                      <SuspendToggle userId={user.id} isActive={user.isActive} isSelf={isSelf} />
                    </div>
                    <span className="text-xs text-zinc-400 whitespace-nowrap lg:text-right">
                      {formatDistanceToNow(user.createdAt, { addSuffix: true, locale: localeId })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                buildHref={(p) => `/dashboard/users?page=${p}${role ? `&role=${role}` : ""}`}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
