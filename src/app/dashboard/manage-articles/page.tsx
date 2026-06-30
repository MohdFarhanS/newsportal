import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllArticlesAdmin } from "@/lib/cms-articles";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { ArticleStatus } from "@/generated/prisma/client";
import Pagination from "@/components/layout/Pagination";
import OverrideActions from "./OverrideActions";
import FeaturedToggle from "./FeaturedToggle";

export const metadata: Metadata = { title: "Kelola Artikel" }

const STATUS_LABEL: Record<ArticleStatus, string> = {
    DRAFT: "Draft",
    REVIEW: "Review",
    REJECTED: "Rejected",
    SCHEDULED: "Scheduled",
    PUBLISHED: "Published",
}

const STATUS_CLASS: Record<ArticleStatus, string> = {
    DRAFT: "text-zinc-500 bg-zinc-100",
    REVIEW: "text-blue-600 bg-blue-50",
    REJECTED: "text-red-600 bg-red-50",
    SCHEDULED: "text-orange-600 bg-orange-50",
    PUBLISHED: "text-green-600 bg-green-50",
}

export default async function ManageArticlesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")
    const { role } = session.user
    if (role !== "ADMIN" && role !== "EDITOR") redirect("/dashboard")

    const { page: pageParam } = await searchParams
    const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)

    const { articles, totalPages } = await getAllArticlesAdmin(page)
    const isAdmin = role === "ADMIN"

    return (
        <div>
            <div className="border-t border-zinc-200 mb-2" />
            <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
                {isAdmin ? "Admin" : "Redaksi"}
            </p>
            <div className="h-[3px] bg-red-600 mt-2 mb-6" />

            <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900 mb-6">
                Kelola Artikel
            </h1>

            {articles.length === 0 ? (
                <p className="text-sm text-zinc-400">Belum ada artikel.</p>
            ) : (
                <div className="divide-y divide-zinc-100">
                {articles.map((article) => (
                    <div key={article.id} className="py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{article.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                        {article.author.name} · {article.category.name} ·{" "}
                        {formatDistanceToNow(article.updatedAt, {
                            addSuffix: true,
                            locale: localeId,
                        })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                        className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm font-medium ${STATUS_CLASS[article.status]}`}
                        >
                        {STATUS_LABEL[article.status]}
                        </span>
                        {article.status === "PUBLISHED" && (
                          <FeaturedToggle articleId={article.id} isFeatured={article.isFeatured} />
                        )}
                        {isAdmin && (
                          <OverrideActions articleId={article.id} currentStatus={article.status} />
                        )}
                    </div>
                    </div>
                ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="mt-8">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        basePath="/dashboard/manage-articles"
                    />
                </div>
            )}
        </div>
    )
}