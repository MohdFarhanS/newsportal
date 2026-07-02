import Image from "next/image"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { ArticleWithRelations, TrendingArticle } from "@/lib/articles"

const PLACEHOLDER = "/placeholder-article.jpg"

export function cloudinarySrc(url: string | null | undefined): string {
  if (!url) return PLACEHOLDER
  // ponytail: w_1200 pre-sizes at Cloudinary so next/image receives a smaller origin image; f_auto,q_auto handles format+quality
  if (url.includes("res.cloudinary.com")) return url.replace("/upload/", "/upload/w_1200,f_auto,q_auto/")
  return url
}

function timeAgo(date: Date | null) {
  if (!date) return ""
  return formatDistanceToNow(date, { addSuffix: true, locale: idLocale })
}

interface HeroCardProps {
  article: ArticleWithRelations
}

export function HeroCard({ article }: HeroCardProps) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="group block hover:opacity-90 transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded mb-3">
        <Image
          src={cloudinarySrc(article.coverImageUrl)}
          alt={article.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 58vw"
          priority
        />
      </div>
      {article.category && (
        <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
          {article.category.name}
        </span>
      )}
      <h3 className="mt-1 font-heading text-2xl font-bold leading-tight text-[#09090B] line-clamp-3">
        {article.title}
      </h3>
      {article.excerpt && (
        <p className="mt-2 text-sm text-[#6B7280] line-clamp-2">{article.excerpt}</p>
      )}
      <p className="mt-2 text-xs text-[#6B7280]">
        {article.author.name} · {timeAgo(article.publishedAt)}
      </p>
    </Link>
  )
}

interface HorizontalCardProps {
  article: ArticleWithRelations
}

export function HorizontalCard({ article }: HorizontalCardProps) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="group flex gap-3 hover:opacity-90 transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring rounded min-h-[44px]"
    >
      <div className="relative w-24 h-20 flex-shrink-0 overflow-hidden rounded">
        <Image
          src={cloudinarySrc(article.coverImageUrl)}
          alt={article.title}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      <div className="flex flex-col justify-between min-w-0">
        <h3 className="font-heading text-sm font-semibold leading-snug text-[#09090B] line-clamp-3">
          {article.title}
        </h3>
        <p className="text-xs text-[#6B7280] mt-1">
          {article.category?.name && (
            <span className="text-red-600 font-semibold">{article.category.name} · </span>
          )}
          {timeAgo(article.publishedAt)}
        </p>
      </div>
    </Link>
  )
}

interface SecondaryCardProps {
  article: ArticleWithRelations
}

export function SecondaryCard({ article }: SecondaryCardProps) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="group block hover:opacity-90 transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded mb-2">
        <Image
          src={cloudinarySrc(article.coverImageUrl)}
          alt={article.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 38vw"
        />
      </div>
      <h3 className="font-heading text-base font-semibold leading-snug text-[#09090B] line-clamp-2">
        {article.title}
      </h3>
      <p className="text-xs text-[#6B7280] mt-1">
        {article.category?.name && (
          <span className="text-red-600 font-semibold">{article.category.name} · </span>
        )}
        {timeAgo(article.publishedAt)}
      </p>
    </Link>
  )
}

interface NumberedCardProps {
  article: TrendingArticle
  rank: number
}

export function NumberedCard({ article, rank }: NumberedCardProps) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="group flex gap-3 items-start hover:opacity-90 transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring rounded min-h-[44px]"
    >
      <span className="text-3xl font-bold text-[#E4E4E7] leading-none w-8 flex-shrink-0 select-none motion-reduce:transition-none">
        {rank}
      </span>
      <div className="min-w-0">
        <h3 className="font-heading text-sm font-semibold leading-snug text-[#09090B] line-clamp-3">
          {article.title}
        </h3>
        <p className="text-xs text-[#6B7280] mt-1">
          {article.viewCount.toLocaleString("id-ID")} tayangan
        </p>
      </div>
    </Link>
  )
}