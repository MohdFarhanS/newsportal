import Link from "next/link"

export default function NotFound() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-600 mb-4">404</p>
      <h1 className="font-heading text-4xl font-bold text-[#09090B] mb-4">
        Halaman Tidak Ditemukan
      </h1>
      <p className="text-[#6B7280] mb-8 max-w-md mx-auto">
        Halaman yang Anda cari mungkin telah dipindahkan, dihapus, atau tidak pernah ada.
      </p>
      <div className="flex items-center justify-center gap-6">
        <Link
          href="/"
          className="text-sm font-semibold text-[#09090B] hover:text-red-600 transition-colors"
        >
          ← Kembali ke Beranda
        </Link>
        <Link
          href="/latest"
          className="text-sm font-semibold text-[#09090B] hover:text-red-600 transition-colors"
        >
          Berita Terbaru
        </Link>
        <Link
          href="/search"
          className="text-sm font-semibold text-[#09090B] hover:text-red-600 transition-colors"
        >
          Cari Artikel
        </Link>
      </div>
    </main>
  )
}
