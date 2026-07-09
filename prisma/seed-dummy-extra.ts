import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { ArticleStatus } from '../src/generated/prisma/enums'
import slugify from 'slugify'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Bank subjek + angle per kategori (slug kategori harus sudah dibuat prisma/seed.ts).
// title = "{angle} {subject}" — kombinasi subject x angle dijamin unik per kategori.
const CATEGORY_BANKS: Record<
  string,
  { subjects: string[]; angles: string[] }
> = {
  teknologi: {
    subjects: [
      'Startup AI Lokal',
      'Chip Semikonduktor Nasional',
      'Platform Cloud Pemerintah',
      'Aplikasi Super Buatan Anak Bangsa',
      'Jaringan 5G di Kota Besar',
      'Sistem Keamanan Siber Perbankan',
    ],
    angles: [
      'Luncurkan Fitur Terbaru',
      'Raih Penghargaan Inovasi',
      'Catat Pertumbuhan Pengguna Signifikan',
      'Hadapi Tantangan Regulasi Data',
      'Perkenalkan Terobosan Baru di',
      'Perluas Jangkauan ke Seluruh Indonesia lewat',
    ],
  },
  bisnis: {
    subjects: [
      'Startup Logistik Nasional',
      'Emiten Perbankan Digital',
      'Rantai Ritel Modern',
      'Industri Manufaktur Ekspor',
      'Perusahaan Energi Terbarukan',
      'Koperasi UMKM Digital',
    ],
    angles: [
      'Bukukan Laba Kuartal Terbaik',
      'Gaet Investor Strategis untuk',
      'Ekspansi Pasar Baru lewat',
      'Optimistis Hadapi Tahun Depan dengan',
      'Umumkan Rencana Merger di',
      'Tingkatkan Efisiensi Operasional lewat',
    ],
  },
  olahraga: {
    subjects: [
      'Timnas Sepak Bola Indonesia',
      'Liga Bulu Tangkis Nasional',
      'Klub Basket Ibu Kota',
      'Atlet Renang Muda',
      'Turnamen Esports Nasional',
      'Cabang Olahraga Angkat Besi',
    ],
    angles: [
      'Torehkan Prestasi Membanggakan di',
      'Persiapkan Diri Jelang',
      'Raih Kemenangan Dramatis di',
      'Dapatkan Dukungan Penuh untuk',
      'Tunjukkan Performa Impresif di',
      'Siap Berlaga di',
    ],
  },
  hiburan: {
    subjects: [
      'Film Drama Keluarga Terbaru',
      'Series Original Platform Streaming',
      'Konser Musisi Tanah Air',
      'Festival Film Independen',
      'Drama Musikal Panggung Nasional',
      'Album Kolaborasi Musisi Muda',
    ],
    angles: [
      'Cetak Rekor Penonton di',
      'Dapat Sambutan Hangat lewat',
      'Umumkan Jadwal Tayang',
      'Gaet Bintang Papan Atas untuk',
      'Raih Ulasan Positif Kritikus lewat',
      'Siap Tayang Perdana lewat',
    ],
  },
  kesehatan: {
    subjects: [
      'Program Vaksinasi Nasional',
      'Riset Obat Herbal Lokal',
      'Layanan Telemedicine Daerah',
      'Kampanye Gizi Anak',
      'Fasilitas Kesehatan Mental',
      'Deteksi Dini Penyakit Tidak Menular',
    ],
    angles: [
      'Perluas Cakupan lewat',
      'Tunjukkan Hasil Positif dari',
      'Diperkuat Pemerintah lewat',
      'Jangkau Daerah Terpencil lewat',
      'Dorong Kesadaran Masyarakat lewat',
      'Catatkan Kemajuan Berarti lewat',
    ],
  },
  politik: {
    subjects: [
      'Kebijakan Otonomi Daerah',
      'Reformasi Birokrasi Nasional',
      'Program Bantuan Sosial',
      'Regulasi Perlindungan Data Pribadi',
      'Agenda Legislasi Prioritas',
      'Kerja Sama Bilateral Baru',
    ],
    angles: [
      'Disahkan lewat',
      'Dapat Dukungan Lintas Fraksi untuk',
      'Jadi Sorotan Publik lewat',
      'Diperdebatkan di Sidang',
      'Diperkuat Pemerintah lewat',
      'Ditargetkan Rampung lewat',
    ],
  },
}

const now = new Date()
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000)

async function main() {
  const author = await prisma.user.findUnique({ where: { email: 'journalist@newsportal.com' } })
  if (!author) {
    throw new Error('Author journalist@newsportal.com tidak ditemukan. Jalankan "npm run db:seed" dulu.')
  }

  const categories = await prisma.category.findMany({
    where: { slug: { in: Object.keys(CATEGORY_BANKS) } },
  })
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))

  const allTags = await prisma.tag.findMany()
  if (allTags.length === 0) {
    throw new Error('Tag tidak ditemukan. Jalankan "npm run db:seed" dulu.')
  }

  const createdArticles: { id: string }[] = []
  let hourOffset = 60 // mulai dari 60 jam lalu, makin lama makin tua (beda dari seed.ts yang 1-48h)

  for (const [categorySlug, bank] of Object.entries(CATEGORY_BANKS)) {
    const category = categoryBySlug.get(categorySlug)
    if (!category) {
      console.warn(`  [skip] kategori "${categorySlug}" tidak ditemukan di DB`)
      continue
    }

    for (let i = 0; i < bank.subjects.length; i++) {
      const subject = bank.subjects[i]
      const angle = bank.angles[i]
      const title = `${angle} ${subject}`
      const slug = slugify(title, { lower: true, strict: true })

      const excerpt = `${subject} menjadi sorotan setelah ${angle.toLowerCase()} dalam beberapa waktu terakhir, menarik perhatian publik dan pemangku kepentingan terkait.`
      const content = `<p>${subject} ${angle.toLowerCase()} pada pekan ini. Perkembangan ini disambut beragam tanggapan dari berbagai kalangan, mulai dari pengamat hingga masyarakat umum.</p><p>Pihak terkait menyatakan akan terus memantau perkembangan selanjutnya dan memberikan informasi lebih lanjut kepada publik.</p>`

      const randomTag = allTags[Math.floor(Math.random() * allTags.length)]

      const article = await prisma.article.upsert({
        where: { slug },
        update: {},
        create: {
          title,
          slug,
          excerpt,
          content,
          coverImageUrl: `https://picsum.photos/seed/${slug}/800/450`,
          status: ArticleStatus.PUBLISHED,
          isFeatured: false,
          publishedAt: hoursAgo(hourOffset),
          authorId: author.id,
          categoryId: category.id,
          tags: { create: [{ tagId: randomTag.id }] },
        },
      })

      createdArticles.push(article)
      hourOffset += Math.floor(Math.random() * 20) + 5 // spread mundur, biar bervariasi
    }
  }

  // View count acak per artikel + ArticleView records, konsisten dengan pola seed.ts
  // (biar analytics/trending tidak kosong untuk artikel baru ini juga).
  for (const article of createdArticles) {
    const count = Math.floor(Math.random() * 60) + 5
    const records = Array.from({ length: count }, (_, i) => ({
      articleId: article.id,
      viewerHash: `dummy_extra_${article.id}_${i}`,
      viewedAt: new Date(now.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000),
    }))
    await prisma.articleView.createMany({ data: records })
    await prisma.article.update({ where: { id: article.id }, data: { viewCount: count } })
  }

  console.log(`Selesai — ${createdArticles.length} artikel dummy tambahan dibuat.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })