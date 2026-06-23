"use client"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <h2 className="font-heading text-2xl font-bold text-[#09090B] mb-4">
        Terjadi Kesalahan
      </h2>
      <p className="text-sm text-[#6B7280] mb-6">
        Halaman tidak dapat dimuat. Coba lagi atau kembali ke beranda.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium bg-[#18181B] text-white rounded hover:bg-zinc-700 transition-colors"
      >
        Coba Lagi
      </button>
    </main>
  )
}
