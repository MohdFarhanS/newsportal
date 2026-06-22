"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  disabled?: boolean
}

type NavSection = {
  label: string
  items: NavItem[]
}

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
      { href: "/dashboard/bookmarks", label: "Bookmark", disabled: true },
      { href: "/dashboard/history", label: "Riwayat Baca", disabled: true },
    ],
  },
]

export default function DashboardNav() {
  const pathname = usePathname()

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
