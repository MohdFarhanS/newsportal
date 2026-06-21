import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Pelajari lebih lanjut tentang NewsPortal — portal berita digital yang menyajikan informasi terkini, akurat, dan terpercaya untuk pembaca Indonesia.",
  alternates: { canonical: "/about" },
}

export default function AboutPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="mb-10 pb-8 border-b border-[#E4E4E7]">
        <h1 className="font-heading text-3xl font-bold text-[#09090B] mb-4">
          Tentang Kami
        </h1>
        <p className="text-base text-[#374151] max-w-2xl leading-relaxed">
          NewsPortal adalah portal berita digital yang hadir untuk menyajikan
          informasi terkini, akurat, dan terpercaya kepada pembaca di seluruh
          Indonesia. Kami percaya bahwa akses terhadap berita berkualitas adalah
          hak setiap orang.
        </p>
      </div>

      {/* Misi */}
      <section className="mb-10">
        <h2 className="font-heading text-xl font-semibold text-[#09090B] mb-4">
          Misi Kami
        </h2>
        <div className="space-y-3 text-sm text-[#374151] leading-relaxed max-w-2xl">
          <p>
            Kami berkomitmen untuk menyampaikan berita yang faktual, berimbang,
            dan bebas dari kepentingan. Setiap artikel yang kami terbitkan
            melewati proses verifikasi ketat oleh tim editorial berpengalaman
            sebelum sampai ke tangan pembaca.
          </p>
          <p>
            Di era informasi yang bergerak cepat, kami hadir sebagai sumber
            yang dapat diandalkan, bukan sekadar yang tercepat, tetapi yang
            paling dapat dipercaya.
          </p>
        </div>
      </section>

      {/* Nilai */}
      <section className="mb-10">
        <h2 className="font-heading text-xl font-semibold text-[#09090B] mb-4">
          Nilai-Nilai Kami
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              title: "Akurasi",
              desc: "Setiap fakta diverifikasi. Kami tidak menerbitkan sesuatu yang belum dikonfirmasi dari sumber terpercaya.",
            },
            {
              title: "Keberimbangan",
              desc: "Kami menyajikan berbagai sudut pandang agar pembaca dapat membentuk opini sendiri secara kritis.",
            },
            {
              title: "Transparansi",
              desc: "Kami terbuka tentang proses editorial kami dan siap memperbaiki kesalahan secara terbuka.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-5 border border-[#E4E4E7] rounded-md"
            >
              <h3 className="font-heading text-base font-semibold text-[#09090B] mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tim Redaksi */}
      <section className="mb-10">
        <h2 className="font-heading text-xl font-semibold text-[#09090B] mb-4">
          Tim Redaksi
        </h2>
        <p className="text-sm text-[#374151] max-w-2xl leading-relaxed">
          NewsPortal dikelola oleh tim jurnalis dan editor yang berdedikasi
          dengan pengalaman di berbagai bidang liputan, mulai dari politik,
          ekonomi, teknologi, hingga gaya hidup. Bersama, kami bekerja setiap
          hari untuk menghadirkan berita yang layak Anda baca.
        </p>
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
          href="/contact"
          className="text-sm font-medium text-[#09090B] hover:text-red-600 transition-colors"
        >
          Hubungi Kami →
        </Link>
      </div>
    </main>
  )
}
