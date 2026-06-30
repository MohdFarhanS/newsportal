import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getAnalyticsSummary, getTopArticles } from "@/lib/analytics"

export const metadata: Metadata = { title: "Analitik" }

const VALID_RANGES = ["7d", "30d", "all"] as const
type Range = (typeof VALID_RANGES)[number]

const RANGE_LABELS: Record<Range, string> = {
  "7d": "7 Hari",
  "30d": "30 Hari",
  all: "Semua Waktu",
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-zinc-200 p-5">
      <dl>
        <dt className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-2">{label}</dt>
        <dd className="font-heading italic text-[36px] leading-none font-bold text-zinc-900">
          {value.toLocaleString("id-ID")}
        </dd>
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

  const [{ totalArticles, publishedArticles, totalViews }, topArticles] =
    await Promise.all([getAnalyticsSummary(), getTopArticles(range)])

  const isAdmin = role === "ADMIN"

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
        <StatCard label="Total Artikel" value={totalArticles} />
        <StatCard label="Artikel Published" value={publishedArticles} />
        <StatCard label="Total Views" value={totalViews} />
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
              aria-current={range === r ? "page" : undefined}
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
        {topArticles.length === 0 ? (
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
    </div>
  )
}
