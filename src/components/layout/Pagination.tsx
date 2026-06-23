import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath?: string
  buildHref?: (page: number) => string
}

export default function Pagination({ currentPage, totalPages, basePath = "/", buildHref }: PaginationProps) {
  const href = buildHref ?? ((page: number) => `${basePath}?page=${page}`)
  const pages = buildPageRange(currentPage, totalPages)

  return (
    <nav aria-label="Halaman" className="flex items-center gap-1">
      <PaginationLink
        href={currentPage > 1 ? href(currentPage - 1) : null}
        aria-label="Sebelumnya"
        disabled={currentPage <= 1}
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline text-sm">Sebelumnya</span>
      </PaginationLink>

      {pages.map((page, i) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-[#6B7280] select-none">
            ...
          </span>
        ) : (
          <Link
            key={page}
            href={href(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={[
              "min-w-[36px] h-9 flex items-center justify-center text-sm rounded transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              page === currentPage
                ? "bg-[#18181B] text-white font-semibold"
                : "text-[#18181B] hover:bg-zinc-100",
            ].join(" ")}
          >
            {page}
          </Link>
        )
      )}

      <PaginationLink
        href={currentPage < totalPages ? href(currentPage + 1) : null}
        aria-label="Berikutnya"
        disabled={currentPage >= totalPages}
      >
        <span className="hidden sm:inline text-sm">Berikutnya</span>
        <ChevronRight size={16} />
      </PaginationLink>
    </nav>
  )
}

function PaginationLink({
  href,
  disabled,
  children,
  "aria-label": ariaLabel,
}: {
  href: string | null
  disabled: boolean
  children: React.ReactNode
  "aria-label": string
}) {
  const cls =
    "flex items-center gap-1 px-2 h-9 text-sm rounded transition-colors focus-visible:ring-2 focus-visible:ring-ring"

  if (disabled || !href) {
    return (
      <span role="button" aria-disabled="true" className={`${cls} text-[#6B7280] cursor-not-allowed`} aria-label={ariaLabel}>
        {children}
      </span>
    )
  }

  return (
    <Link href={href} aria-label={ariaLabel} className={`${cls} text-[#18181B] hover:bg-zinc-100`}>
      {children}
    </Link>
  )
}

function buildPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "ellipsis")[] = [1]

  if (current > 3) pages.push("ellipsis")

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push("ellipsis")

  pages.push(total)

  return pages
}

