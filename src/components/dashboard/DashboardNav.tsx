"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Role } from "@/generated/prisma/client"

type NavItem = {
  href: string
  label: string
  disabled?: boolean
}

type NavSection = {
  label: string
  items: NavItem[]
}

function getSections(role: Role): NavSection[] {
  const sections: NavSection[] = [
    {
      label: "Akun Saya",
      items: [
        { href: "/dashboard/profile", label: "Profil" },
        { href: "/dashboard/security", label: "Keamanan" },
      ],
    },
    {
      label: "Aktivitas",
      items: [
        { href: "/dashboard/bookmarks", label: "Bookmark" },
        { href: "/dashboard/history", label: "Riwayat Baca" },
      ],
    },
  ]

  if (role === "JOURNALIST" || role === "EDITOR" || role === "ADMIN") {
    sections.push({
      label: "Konten",
      items: [
        { href: "/dashboard/articles", label: "Artikel Saya" },
        { href: "/dashboard/articles/new", label: "Tulis Artikel" },
      ],
    })
  }

  if (role === "EDITOR" || role === "ADMIN") {
    sections.push({
      label: "Redaksi",
      items: [
        { href: "/dashboard/review", label: "Antrian Review" },
      ],
    })
  }

  if (role === "ADMIN") {
    sections.push({
      label: "Admin",
      items: [
        { href: "/dashboard/users", label: "Pengguna", disabled: true },
        { href: "/dashboard/taxonomy", label: "Taksonomi", disabled: true },
      ],
    })
  }

  return sections
}

export default function DashboardNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const sections = getSections(role)

  return (
    <nav className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-2">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) =>
              item.disabled ? (
                <li key={item.href}>
                  <span className="block text-sm px-2 py-1.5 text-zinc-300 cursor-not-allowed">
                    {item.label}
                  </span>
                </li>
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block text-sm px-2 py-1.5 rounded transition-colors",
                      pathname === item.href
                        ? "text-zinc-900 font-medium bg-zinc-100"
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            )}
          </ul>
        </div>
      ))}
    </nav>
  )
}
