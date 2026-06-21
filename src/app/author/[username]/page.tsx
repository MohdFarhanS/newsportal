import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { HorizontalCard } from "@/components/news/ArticleCard"
import Pagination from "@/components/layout/Pagination"
import { getAuthorById } from "@/lib/authors"
import { getArticlesByAuthor } from "@/lib/articles"

function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null
  } catch {
    return null
  }
}

interface PageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const author = await getAuthorById(username)
  if (!author) return {}
  return {
    title: `Artikel oleh ${author.name}`,
    description: author.profile?.bio ?? `Baca artikel-artikel dari ${author.name} di NewsPortal.`,
    alternates: { canonical: `/author/${username}` },
  }
}

export default async function AuthorPage({ params, searchParams }: PageProps) {
  const { username } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const author = await getAuthorById(username)
  if (!author) notFound()

  const { articles, total, totalPages } = await getArticlesByAuthor(username, page, 12)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Author Header */}
      <div className="flex items-start gap-5 mb-8 pb-8 border-b border-[#E4E4E7]">
        {author.profile?.avatarUrl ? (
          <Image
            src={author.profile.avatarUrl}
            alt={author.name}
            width={80}
            height={80}
            className="rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#E4E4E7] flex items-center justify-center text-2xl font-bold text-[#6B7280] flex-shrink-0 select-none">
            {author.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold text-[#09090B] mb-1">{author.name}</h1>
          <p className="text-sm text-[#6B7280] mb-2">{total} artikel dipublikasikan</p>
          {author.profile?.bio && (
            <p className="text-sm text-[#374151] mb-3 max-w-prose">{author.profile.bio}</p>
          )}
          {(() => {
            const twitter = safeExternalUrl(author.profile?.socialTwitter)
            const linkedin = safeExternalUrl(author.profile?.socialLinkedin)
            if (!twitter && !linkedin) return null
            return (
              <div className="flex items-center gap-4">
                {twitter && (
                  <Link
                    href={twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#6B7280] hover:text-[#09090B] transition-colors"
                  >
                    Twitter / X
                  </Link>
                )}
                {linkedin && (
                  <Link
                    href={linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#6B7280] hover:text-[#09090B] transition-colors"
                  >
                    LinkedIn
                  </Link>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Article List */}
      <h2 className="font-heading text-lg font-semibold text-[#09090B] mb-5">
        Artikel oleh {author.name}
      </h2>

      {articles.length === 0 ? (
        <p className="text-sm text-[#6B7280]">Belum ada artikel yang dipublikasikan.</p>
      ) : (
        <div className="flex flex-col gap-5 divide-y divide-[#E4E4E7]">
          {articles.map((article) => (
            <div key={article.id} className="pt-5 first:pt-0">
              <HorizontalCard article={article} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            basePath={`/author/${username}`}
          />
        </div>
      )}
    </main>
  )
}
