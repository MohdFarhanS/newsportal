import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-[#E4E4E7] bg-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-heading text-sm font-semibold text-[#09090B]">
            NewsPortal
          </span>

          <nav aria-label="Footer" className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-sm text-[#6B7280] hover:text-[#09090B] transition-colors"
            >
              Tentang Kami
            </Link>
            <Link
              href="/contact"
              className="text-sm text-[#6B7280] hover:text-[#09090B] transition-colors"
            >
              Hubungi Kami
            </Link>
          </nav>

          <p className="text-xs text-[#6B7280]">
            &copy; {new Date().getFullYear()} NewsPortal
          </p>
        </div>
        <p className="text-xs text-[#9CA3AF] text-center mt-4">
          Portfolio project — all content is fictional.
        </p>
      </div>
    </footer>
  )
}
