"use client"

import { useEffect } from "react"
import { trackArticleView } from "@/lib/actions/view"

export function ViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    trackArticleView(articleId)
  }, [articleId])
  return null
}
