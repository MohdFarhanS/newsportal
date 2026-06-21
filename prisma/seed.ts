import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { ArticleStatus, Role } from '../src/generated/prisma/enums'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  const author = await prisma.user.upsert({
    where: { email: 'journalist@newsportal.com' },
    update: {},
    create: {
      name: 'Ahmad Fauzi',
      email: 'journalist@newsportal.com',
      passwordHash,
      role: Role.JOURNALIST,
      profile: {
        create: {
          bio: 'Jurnalis senior dengan pengalaman 10 tahun di bidang teknologi dan bisnis.',
        },
      },
    },
  })

  const [teknologi, bisnis, olahraga, hiburan, kesehatan, politik] = await Promise.all([
    prisma.category.upsert({ where: { slug: 'teknologi' }, update: {}, create: { name: 'Teknologi', slug: 'teknologi', description: 'Berita teknologi terkini' } }),
    prisma.category.upsert({ where: { slug: 'bisnis' }, update: {}, create: { name: 'Bisnis', slug: 'bisnis', description: 'Berita ekonomi dan bisnis' } }),
    prisma.category.upsert({ where: { slug: 'olahraga' }, update: {}, create: { name: 'Olahraga', slug: 'olahraga', description: 'Berita olahraga terbaru' } }),
    prisma.category.upsert({ where: { slug: 'hiburan' }, update: {}, create: { name: 'Hiburan', slug: 'hiburan', description: 'Hiburan dan selebriti' } }),
    prisma.category.upsert({ where: { slug: 'kesehatan' }, update: {}, create: { name: 'Kesehatan', slug: 'kesehatan', description: 'Tips dan berita kesehatan' } }),
    prisma.category.upsert({ where: { slug: 'politik' }, update: {}, create: { name: 'Politik', slug: 'politik', description: 'Berita politik nasional' } }),
  ])

  const now = new Date()
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000)

  const featured1 = await prisma.article.upsert({
    where: { slug: 'revolusi-ai-mengubah-industri-media-2026' },
    update: {},
    create: {
      title: 'Revolusi AI Mengubah Industri Media di 2026',
      slug: 'revolusi-ai-mengubah-industri-media-2026',
      excerpt: 'Kecerdasan buatan semakin mengintegrasikan diri ke dalam redaksi berita, membawa perubahan besar pada cara konten diproduksi dan dikonsumsi.',
      content: '<p>Kecerdasan buatan (AI) kini menjadi bagian tak terpisahkan dari ruang redaksi modern.</p>',
      status: ArticleStatus.PUBLISHED,
      isFeatured: true,
      publishedAt: hoursAgo(1),
      authorId: author.id,
      categoryId: teknologi.id,
    },
  })

  const featured2 = await prisma.article.upsert({
    where: { slug: 'startup-fintech-series-b-500-miliar' },
    update: {},
    create: {
      title: 'Startup Fintech Indonesia Raih Pendanaan Series B Rp 500 Miliar',
      slug: 'startup-fintech-series-b-500-miliar',
      excerpt: 'Salah satu startup fintech terbesar Indonesia berhasil menutup pendanaan Series B senilai Rp 500 miliar dari investor asing dan domestik.',
      content: '<p>Startup fintech ini berhasil menarik minat investor besar dari Singapura dan Amerika Serikat.</p>',
      status: ArticleStatus.PUBLISHED,
      isFeatured: true,
      publishedAt: hoursAgo(3),
      authorId: author.id,
      categoryId: bisnis.id,
    },
  })

  const featured3 = await prisma.article.upsert({
    where: { slug: 'timnas-indonesia-lolos-final-piala-aff-2026' },
    update: {},
    create: {
      title: 'Timnas Indonesia Lolos ke Final Piala AFF 2026',
      slug: 'timnas-indonesia-lolos-final-piala-aff-2026',
      excerpt: 'Skuad Garuda berhasil mengalahkan Thailand 2-1 dan melaju ke babak final Piala AFF untuk pertama kalinya dalam sejarah turnamen.',
      content: '<p>Pertandingan semifinal yang berlangsung di Stadion Gelora Bung Karno berlangsung penuh drama.</p>',
      status: ArticleStatus.PUBLISHED,
      isFeatured: true,
      publishedAt: hoursAgo(5),
      authorId: author.id,
      categoryId: olahraga.id,
    },
  })

  const regularData = [
    { title: 'Film Adaptasi Novel Terlaris Tayang Perdana di Bioskop', slug: 'film-adaptasi-novel-terlaris-tayang-perdana', categoryId: hiburan.id, hoursAgo: 8 },
    { title: 'Cara Menjaga Kesehatan Mental di Era Digital', slug: 'cara-menjaga-kesehatan-mental-era-digital', categoryId: kesehatan.id, hoursAgo: 12 },
    { title: 'Pemerintah Luncurkan Program Digitalisasi UMKM Nasional', slug: 'pemerintah-luncurkan-program-digitalisasi-umkm', categoryId: politik.id, hoursAgo: 16 },
    { title: 'Inovasi Baterai Solid-State Percepat Adopsi Kendaraan Listrik', slug: 'inovasi-baterai-solid-state-kendaraan-listrik', categoryId: teknologi.id, hoursAgo: 20 },
    { title: 'Indeks Harga Saham Gabungan Tembus 8.000 Poin', slug: 'ihsg-tembus-8000-poin-rekor-baru', categoryId: bisnis.id, hoursAgo: 24 },
    { title: 'Peneliti Temukan Kandidat Vaksin Dengue Generasi Baru', slug: 'peneliti-temukan-kandidat-vaksin-dengue-baru', categoryId: kesehatan.id, hoursAgo: 30 },
    { title: 'Liga 1 Indonesia: Persija Pimpin Klasemen Setelah Pekan ke-20', slug: 'liga-1-persija-pimpin-klasemen-pekan-20', categoryId: olahraga.id, hoursAgo: 36 },
    { title: 'Pameran Seni Kontemporer Terbesar Hadir di Jakarta Convention Center', slug: 'pameran-seni-kontemporer-terbesar-jakarta', categoryId: hiburan.id, hoursAgo: 48 },
  ]

  for (const data of regularData) {
    await prisma.article.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        title: data.title,
        slug: data.slug,
        excerpt: `Baca selengkapnya tentang ${data.title.toLowerCase()} dan dampaknya bagi masyarakat Indonesia.`,
        content: `<p>Artikel lengkap tentang ${data.title}.</p>`,
        status: ArticleStatus.PUBLISHED,
        isFeatured: false,
        publishedAt: hoursAgo(data.hoursAgo),
        authorId: author.id,
        categoryId: data.categoryId,
      },
    })
  }

  const allArticles = await prisma.article.findMany({ where: { status: ArticleStatus.PUBLISHED } })

  const viewCountMap: Record<string, number> = {
    [featured3.id]: 52,
    [featured1.id]: 45,
    [featured2.id]: 30,
  }
  const regularCounts = [28, 35, 18, 40, 22, 15, 25, 10]
  allArticles
    .filter((a) => !a.isFeatured)
    .forEach((article, i) => {
      viewCountMap[article.id] = regularCounts[i] ?? 5
    })

  for (const article of allArticles) {
    const count = viewCountMap[article.id] ?? 5
    const records = Array.from({ length: count }, (_, i) => ({
      articleId: article.id,
      viewerHash: `hash_10_0_${Math.floor(i / 255)}_${i % 255}`,
      viewedAt: new Date(now.getTime() - Math.random() * 6 * 24 * 60 * 60 * 1000),
    }))
    await prisma.articleView.createMany({ data: records })
  }

  console.log('Seed selesai:')
  console.log('  - 1 author  ->  journalist@newsportal.com / password123')
  console.log('  - 6 categories')
  console.log('  - 3 featured articles')
  console.log('  - 8 regular articles')
  console.log('  - ArticleView records untuk Trending section')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })