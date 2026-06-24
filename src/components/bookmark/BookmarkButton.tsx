"use client"

import { useState, useTransition } from "react"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { toggleBookmarkAction } from "@/actions/bookmark"

interface BookmarkButtonProps {
  articleId: string
  initialBookmarked: boolean
}

export default function BookmarkButton({ articleId, initialBookmarked }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleBookmarkAction(articleId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setBookmarked(result.bookmarked ?? false)
      toast.success(result.bookmarked ? "Artikel disimpan ke bookmark" : "Bookmark dihapus")
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={bookmarked ? "Hapus bookmark" : "Simpan bookmark"}
      title={bookmarked ? "Hapus bookmark" : "Simpan bookmark"}
    >
      {bookmarked ? (
        <BookmarkCheck className="size-4 text-red-600" />
      ) : (
        <Bookmark className="size-4 text-zinc-500" />
      )}
    </Button>
  )
}
