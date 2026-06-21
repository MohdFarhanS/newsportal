import Link from "next/link"
import { Search } from "lucide-react"
import { getNavCategories } from "@/lib/categories"
import { auth } from "@/lib/auth"
import LogoutButton from "@/components/layout/LogoutButton"

export default async function Navbar() {
  const [categories, session] = await Promise.all([getNavCategories(), auth()])

  return (
    <header className="border-b border-[#E4E4E7] bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/"
            className="font-heading text-xl font-bold text-[#18181B] focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            NewsPortal
          </Link>

          <nav aria-label="Kategori" className="hidden md:flex items-center gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="text-sm font-medium text-[#18181B] hover:text-red-600 transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/search"
              aria-label="Cari"
              className="p-2 text-[#6B7280] hover:text-[#18181B] transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <Search size={18} />
            </Link>
            {session?.user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium px-3 py-1.5 bg-[#18181B] text-white rounded hover:bg-zinc-700 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Dashboard
                </Link>
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium px-3 py-1.5 bg-[#18181B] text-white rounded hover:bg-zinc-700 transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
