import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getAnalyticsSummary } from "@/lib/analytics"

export const metadata: Metadata = { title: "Analitik" }

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

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const { role } = session.user
  if (role !== "ADMIN" && role !== "EDITOR") redirect("/dashboard")

  const { totalArticles, publishedArticles, totalViews } = await getAnalyticsSummary()
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Artikel" value={totalArticles} />
        <StatCard label="Artikel Published" value={publishedArticles} />
        <StatCard label="Total Views" value={totalViews} />
      </div>
    </div>
  )
}
