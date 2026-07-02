import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { getArticleBySlug, getRelatedArticles } from "@/lib/articles"
import { SANITIZE_OPTIONS } from "@/lib/sanitize"
import sanitizeHtml from "sanitize-html"
import { HorizontalCard, cloudinarySrc } from "@/components/news/ArticleCard"
import { ViewTracker } from "./ViewTracker"
import { HistoryTracker } from "./HistoryTracker"
import { auth } from "@/lib/auth"
import { isArticleBookmarked } from "@/lib/bookmarks"
import BookmarkButton from "@/components/bookmark/BookmarkButton"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return {}

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const ogImage = article.coverImageUrl ?? `${base}/og-default.jpg`

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/article/${slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [article.author.name],
      images: [{ url: ogImage, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [ogImage],
    },
  }
}

function readingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "")
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const [related, session] = await Promise.all([
    getRelatedArticles(article.categoryId, slug),
    auth(),
  ])
  const bookmarked = session?.user?.id
    ? await isArticleBookmarked(session.user.id, article.id)
    : false
  const minutes = readingTime(article.content)

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: article.author.name,
      url: `${base}/author/${article.author.id}`,
    },
    image: [article.coverImageUrl ?? `${base}/og-default.jpg`],
    mainEntityOfPage: { "@type": "WebPage", "@id": `${base}/article/${slug}` },
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: "NewsPortal",
      logo: {
        "@type": "ImageObject",
        url: `${base}/logo.png`,
        width: 512,
        height: 512,
      },
    },
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: base },
      { "@type": "ListItem", position: 2, name: article.category.name, item: `${base}/category/${article.category.slug}` },
      { "@type": "ListItem", position: 3, name: article.title, item: `${base}/article/${slug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }}
      />
      <ViewTracker articleId={article.id} />
      {session?.user?.id && <HistoryTracker articleId={article.id} />}

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Category */}
        <div className="mb-3">
          <Link
            href={`/category/${article.category.slug}`}
            className="text-xs font-semibold uppercase tracking-wider text-red-600 hover:underline"
          >
            {article.category.name}
          </Link>
        </div>

        {/* Title */}
        <h1 className="font-heading text-3xl md:text-4xl font-bold leading-tight text-[#09090B] mb-4">
          {article.title}
        </h1>

        {/* Excerpt */}
        <p className="text-lg text-[#6B7280] mb-5 leading-relaxed">{article.excerpt}</p>

        {/* Author + date + reading time */}
        <div className="flex items-center justify-between gap-3 mb-6 pb-6 border-b border-[#E4E4E7]">
          <div className="flex items-center gap-3 min-w-0">
            {article.author.profile?.avatarUrl ? (
              <Image
                src={article.author.profile.avatarUrl}
                alt={article.author.name}
                width={40}
                height={40}
                className="rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#E4E4E7] flex items-center justify-center text-sm font-semibold text-[#6B7280] flex-shrink-0 select-none">
                {article.author.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <Link
                href={`/author/${article.author.id}`}
                className="text-sm font-semibold text-[#09090B] hover:underline"
              >
                {article.author.name}
              </Link>
              <p className="text-xs text-[#6B7280]">
                {article.publishedAt
                  ? format(article.publishedAt, "d MMMM yyyy", { locale: idLocale })
                  : ""}
                {" · "}
                {minutes} menit baca
              </p>
            </div>
          </div>
          {session?.user?.id && (
            <BookmarkButton articleId={article.id} initialBookmarked={bookmarked} />
          )}
        </div>

        {/* Cover Image */}
        {article.coverImageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded mb-8">
            <Image
              src={cloudinarySrc(article.coverImageUrl)}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
        )}

        {/* Article Content */}
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content, SANITIZE_OPTIONS) }}
        />

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-[#E4E4E7]">
            {article.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-[#F4F4F5] text-xs font-medium text-[#6B7280] rounded-full"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Related Articles */}
        {related.length > 0 && (
          <section className="mt-10 pt-8 border-t border-[#E4E4E7]">
            <h2 className="font-heading text-xl font-bold text-[#09090B] mb-5">
              Artikel Terkait
            </h2>
            <div className="flex flex-col gap-4">
              {related.map((rel) => (
                <HorizontalCard key={rel.id} article={rel} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
