import Link from "next/link"
import { Mail } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description:
    "Punya pertanyaan, saran, atau ingin berkolaborasi? Hubungi tim NewsPortal melalui email kami.",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="mb-10 pb-8 border-b border-[#E4E4E7]">
        <h1 className="font-heading text-3xl font-bold text-[#09090B] mb-4">
          Hubungi Kami
        </h1>
        <p className="text-base text-[#374151] max-w-2xl leading-relaxed">
          Punya pertanyaan, masukan, atau ingin berkolaborasi dengan tim
          NewsPortal? Jangan ragu untuk menghubungi kami. Kami akan merespons
          secepatnya.
        </p>
      </div>

      {/* Kontak Utama */}
      <section className="mb-10">
        <h2 className="font-heading text-xl font-semibold text-[#09090B] mb-6">
          Informasi Kontak
        </h2>

        <div className="flex flex-col gap-6 max-w-lg">
          {/* Email Redaksi */}
          <div className="flex items-start gap-4 p-5 border border-[#E4E4E7] rounded-md">
            <div className="mt-0.5 flex-shrink-0 text-[#6B7280]">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#09090B] mb-1">
                Email Redaksi
              </p>
              <a
                href="mailto:mohdfarhansyafaat@gmail.com"
                className="text-sm text-red-600 hover:text-red-700 transition-colors break-all"
              >
                mohdfarhansyafaat@gmail.com
              </a>
              <p className="text-xs text-[#6B7280] mt-1">
                Untuk pertanyaan editorial, koreksi berita, dan kolaborasi
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Info tambahan */}
      <section className="mb-10">
        <h2 className="font-heading text-xl font-semibold text-[#09090B] mb-4">
          Waktu Respons
        </h2>
        <p className="text-sm text-[#374151] max-w-2xl leading-relaxed">
          Tim kami berusaha membalas setiap pesan dalam waktu 1–2 hari kerja.
          Untuk laporan kesalahan fakta atau klarifikasi berita, kami
          memprioritaskan respons dalam 24 jam.
        </p>
      </section>

      {/* Panduan mengirim pesan */}
      <section className="mb-10">
        <h2 className="font-heading text-xl font-semibold text-[#09090B] mb-4">
          Tips Mengirim Pesan
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-[#374151] max-w-2xl">
          <li>Tuliskan subjek email yang jelas dan spesifik.</li>
          <li>
            Sertakan URL artikel jika pesan Anda berkaitan dengan konten
            tertentu.
          </li>
          <li>
            Untuk keperluan bisnis atau kemitraan, sertakan informasi
            perusahaan Anda.
          </li>
        </ul>
      </section>

      {/* CTA */}
      <div className="pt-6 border-t border-[#E4E4E7] flex flex-wrap gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-[#09090B] hover:text-red-600 transition-colors"
        >
          ← Kembali ke Beranda
        </Link>
        <Link
          href="/about"
          className="text-sm font-medium text-[#09090B] hover:text-red-600 transition-colors"
        >
          Tentang Kami →
        </Link>
      </div>
    </main>
  )
}
