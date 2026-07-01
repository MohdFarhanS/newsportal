import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { format, parseISO } from "date-fns"
import { auth } from "@/lib/auth"
import { getAnalyticsSummary, getTopArticles, getNewUsersPerWeek, type WeeklyUsers } from "@/lib/analytics"

export const metadata: Metadata = { title: "Analitik" }

const VALID_RANGES = ["7d", "30d", "all"] as const
type Range = (typeof VALID_RANGES)[number]

const RANGE_LABELS: Record<Range, string> = {
  "7d": "7 Hari",
  "30d": "30 Hari",
  all: "Semua Waktu",
}

// null = fetch error (show error UI); [] = genuine empty (no users yet)
function NewUsersChart({ data }: { data: WeeklyUsers[] | null }) {
  if (data === null) {
    return (
      <div className="border border-zinc-200 px-5 py-8 text-sm text-zinc-400 text-center">
        Gagal memuat data. Coba muat ulang halaman.
      </div>
    )
  }
  if (data.length === 0) {
    return (
      <div className="border border-zinc-200 px-5 py-8 text-sm text-zinc-400 text-center">
        Belum ada data pengguna.
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div
      role="img"
      aria-label="Grafik pengguna baru per minggu (12 minggu terakhir)"
      className="border border-zinc-200 p-5"
    >
      <div className="flex items-end gap-px sm:gap-1 h-36" aria-hidden="true">
        {data.map(({ week, count }) => (
          <div key={week} className="flex-1 flex flex-col items-center justify-end h-full group">
            <div
              className="relative w-full bg-red-600 hover:bg-red-700 transition-colors rounded-t-sm"
              style={{ height: count === 0 ? "2px" : `${Math.round((count / maxCount) * 100)}%` }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-zinc-600 hidden group-hover:block whitespace-nowrap z-10 bg-white border border-zinc-200 px-1 rounded">
                {count}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-px sm:gap-1 mt-2">
        {data.map(({ week }, i) => (
          <div
            key={week}
            className={`flex-1 text-center text-[9px] text-zinc-400 truncate ${i % 3 !== 0 && i !== data.length - 1 ? "invisible" : ""}`}
          >
            {format(parseISO(week), "d/M")}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, sublabel }: { label: string; value: number; sublabel?: string }) {
  return (
    <div className="border border-zinc-200 p-5">
      <dl>
        <dt className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-2">{label}</dt>
        <dd className="font-heading italic text-[36px] leading-none font-bold text-zinc-900">
          {value.toLocaleString("id-ID")}
        </dd>
        {sublabel && (
          <dd className="text-[9px] uppercase tracking-[0.1em] text-zinc-300 mt-1">{sublabel}</dd>
        )}
      </dl>
    </div>
  )
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { role } = session.user
  if (role !== "ADMIN" && role !== "EDITOR") redirect("/dashboard")

  const { range: rawRange } = await searchParams
  const range: Range =
    typeof rawRange === "string" && (VALID_RANGES as readonly string[]).includes(rawRange)
      ? (rawRange as Range)
      : "7d"

  const isAdmin = role === "ADMIN"

  // Promise.allSettled: each section fails independently; DB errors are not cached by unstable_cache
  const [summaryResult, topArticlesResult, newUsersResult] = await Promise.allSettled([
    getAnalyticsSummary(),
    getTopArticles(range),
    isAdmin ? getNewUsersPerWeek() : Promise.resolve<WeeklyUsers[]>([]),
  ])

  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null
  const topArticles = topArticlesResult.status === "fulfilled" ? topArticlesResult.value : null
  // EDITOR always gets [], only ADMIN path can produce null (error) or real data
  const newUsersData = newUsersResult.status === "fulfilled" ? newUsersResult.value : null

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        {isAdmin ? "Admin" : "Redaksi"}
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />

      <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900 mb-8">
        Analitik
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {summary === null ? (
          <div className="col-span-3 border border-zinc-200 px-5 py-4 text-sm text-zinc-400 text-center">
            Gagal memuat statistik.
          </div>
        ) : (
          <>
            <StatCard label="Total Artikel" value={summary.totalArticles} />
            <StatCard label="Artikel Published" value={summary.publishedArticles} />
            <StatCard label="Total Views" value={summary.totalViews} sublabel="semua waktu" />
          </>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
          Top Artikel
        </h2>
        <div className="flex gap-1">
          {VALID_RANGES.map((r) => (
            <Link
              key={r}
              href={`/dashboard/analytics?range=${r}`}
              aria-current={range === r ? true : undefined}
              className={`px-3 py-1 text-[11px] uppercase tracking-[0.15em] border transition-colors ${
                range === r
                  ? "border-red-600 text-red-600 bg-red-50"
                  : "border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400"
              }`}
            >
              {RANGE_LABELS[r]}
            </Link>
          ))}
        </div>
      </div>

      <div className="border border-zinc-200">
        {topArticles === null ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            Gagal memuat data artikel.
          </p>
        ) : topArticles.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            Belum ada data untuk periode ini.
          </p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Top Artikel per Periode</caption>
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th scope="col" className="w-10 px-4 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-medium">
                  #
                </th>
                <th scope="col" className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-medium">
                  Judul
                </th>
                <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-medium">
                  Kategori
                </th>
                <th scope="col" className="hidden md:table-cell px-4 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-medium">
                  Penulis
                </th>
                <th scope="col" className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-zinc-400 font-medium">
                  Views
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {topArticles.map((article, index) => (
                <tr key={article.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[13px] text-zinc-400 tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 min-w-0">
                    <Link
                      href={`/article/${article.slug}`}
                      className="font-medium text-zinc-900 hover:text-red-600 transition-colors line-clamp-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-3 text-zinc-500 whitespace-nowrap">
                    {article.category.name}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-zinc-500 whitespace-nowrap">
                    {article.author.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] text-zinc-700 tabular-nums whitespace-nowrap">
                    {article.viewCount.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin && (
        <div className="mt-10">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-medium mb-4">
            Pengguna Baru per Minggu
          </h2>
          <NewUsersChart data={newUsersData} />
        </div>
      )}
    </div>
  )
}
