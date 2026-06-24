"use client"

import { useEffect } from "react"
import { trackReadingHistoryAction } from "@/actions/readingHistory"

export function HistoryTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    trackReadingHistoryAction(articleId)
  }, [articleId])
  return null
}
