import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getAllCategoriesWithCount } from "@/lib/categories"
import { getAllTagsWithCount } from "@/lib/tags"
import TaxonomyTabs from "./TaxonomyTabs"

export const metadata: Metadata = { title: "Taksonomi" }

export default async function TaxonomyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const [categories, tags] = await Promise.all([
    getAllCategoriesWithCount(),
    getAllTagsWithCount(),
  ])

  return (
    <div>
      <div className="border-t border-zinc-200 mb-2" />
      <p className="font-heading text-[11px] uppercase tracking-[0.3em] text-zinc-400 not-italic">
        Admin
      </p>
      <div className="h-[3px] bg-red-600 mt-2 mb-6" />

      <h1 className="font-heading italic text-[32px] leading-[1.1] font-bold text-zinc-900 mb-6">
        Taksonomi
      </h1>

      <TaxonomyTabs categories={categories} tags={tags} />
    </div>
  )
}
