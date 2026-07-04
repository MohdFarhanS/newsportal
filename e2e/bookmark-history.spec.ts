import "dotenv/config"
import { test, expect } from "@playwright/test"
import {
  getUserIdByEmail,
  seedArticleAtStatus,
  deleteArticleById,
  seedBookmark,
  getBookmarkRaw,
  deleteAllBookmarksForUser,
  seedReadingHistory,
  getReadingHistoryRaw,
  deleteAllReadingHistoryForUser,
} from "./utils/db"
import { newRunId } from "./utils/ids"

let journalistId: string
let userId: string
let editorId: string
let adminId: string

test.beforeAll(async () => {
  journalistId = await getUserIdByEmail("farhan@newsportaljournalist.com")
  userId = await getUserIdByEmail("farhan@newsportaluser.com")
  editorId = await getUserIdByEmail("farhan@newsportaleditor.com")
  adminId = await getUserIdByEmail("farhan@newsportaladmin.com")
})

test.describe("Anonymous visitor has no bookmark affordance", () => {
  let articleId: string
  let articleSlug: string

  test.beforeAll(async () => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "bm-anon", runId })
    articleId = article.id
    articleSlug = article.slug
  })

  test.afterAll(async () => {
    await deleteArticleById(articleId)
  })

  test("article page renders no bookmark button for an anonymous visitor", async ({ page }) => {
    await page.goto(`/article/${articleSlug}`)
    await expect(page.getByRole("button", { name: "Simpan bookmark" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Hapus bookmark" })).toHaveCount(0)
  })
})

test.describe("Bookmark toggle", () => {
  test.use({ storageState: "e2e/.auth/user.json" })

  test("clicking Simpan bookmark bookmarks the article and it appears in /dashboard/bookmarks", async ({ page }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "bm-toggle-on", runId })
    try {
      await page.goto(`/article/${article.slug}`)
      await page.getByRole("button", { name: "Simpan bookmark" }).click()
      await expect(page.getByRole("button", { name: "Hapus bookmark" })).toBeVisible()
      await expect(page.getByText("Artikel disimpan ke bookmark")).toBeVisible()

      await page.goto("/dashboard/bookmarks")
      await expect(page.getByRole("link", { name: article.title })).toBeVisible()

      expect(await getBookmarkRaw(userId, article.id)).not.toBeNull()
    } finally {
      await deleteArticleById(article.id)
    }
  })

  test("re-clicking Hapus bookmark un-bookmarks it and it disappears from /dashboard/bookmarks", async ({ page }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "bm-toggle-off", runId })
    try {
      await seedBookmark(userId, article.id)
      await page.goto(`/article/${article.slug}`)
      await expect(page.getByRole("button", { name: "Hapus bookmark" })).toBeVisible()

      await page.getByRole("button", { name: "Hapus bookmark" }).click()
      await expect(page.getByRole("button", { name: "Simpan bookmark" })).toBeVisible()
      await expect(page.getByText("Bookmark dihapus")).toBeVisible()

      await page.goto("/dashboard/bookmarks")
      await expect(page.getByRole("link", { name: article.title })).not.toBeVisible()

      expect(await getBookmarkRaw(userId, article.id)).toBeNull()
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Reading history auto-tracking", () => {
  test.use({ storageState: "e2e/.auth/journalist.json" })

  test("visiting a published article records it in /dashboard/history", async ({ page }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "hist-track", runId })
    try {
      await page.goto(`/article/${article.slug}`)
      // HistoryTracker's trackReadingHistoryAction call is fire-and-forget (no await, no UI
      // feedback) — navigating away too quickly can abort the in-flight POST before it lands.
      // Give it a moment to complete before leaving the page.
      await page.waitForTimeout(2000)
      await page.goto("/dashboard/history")
      await expect(page.getByRole("link", { name: article.title })).toBeVisible()
    } finally {
      await deleteArticleById(article.id)
    }
  })

  test("a second visit updates readAt without duplicating the row", async ({ page }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "hist-repeat", runId })
    try {
      await page.goto(`/article/${article.slug}`)
      // HistoryTracker's trackReadingHistoryAction call is fire-and-forget (no await, no UI
      // feedback) — navigating away too quickly can abort the in-flight POST before it lands.
      // Give it a moment to complete before leaving the page.
      await page.waitForTimeout(2000)
      await page.goto("/dashboard/history")
      await expect(page.getByRole("link", { name: article.title })).toBeVisible()
      const first = await getReadingHistoryRaw(journalistId, article.id)
      expect(first).not.toBeNull()

      // Ensure a measurably different readAt timestamp before the second visit.
      await page.waitForTimeout(1100)
      await page.goto(`/article/${article.slug}`)
      // HistoryTracker's trackReadingHistoryAction call is fire-and-forget (no await, no UI
      // feedback) — navigating away too quickly can abort the in-flight POST before it lands.
      // Give it a moment to complete before leaving the page.
      await page.waitForTimeout(2000)
      await page.goto("/dashboard/history")
      await expect(page.getByRole("link", { name: article.title })).toBeVisible()
      const second = await getReadingHistoryRaw(journalistId, article.id)
      expect(second).not.toBeNull()
      // Same row (schema's @@unique([userId, articleId]) makes a literal duplicate impossible
      // anyway), but the meaningful app-level behavior is that readAt actually advances.
      expect(second!.id).toBe(first!.id)
      expect(second!.readAt.getTime()).toBeGreaterThan(first!.readAt.getTime())
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Delete single history item", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  test("clicking the X removes just that row, with no confirmation prompt", async ({ page }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "hist-del", runId })
    try {
      await seedReadingHistory(editorId, article.id)
      await page.goto("/dashboard/history")

      const row = page.locator(".divide-y > div").filter({ hasText: article.title })
      await expect(row).toBeVisible()
      await row.getByRole("button", { name: "Hapus dari riwayat" }).click()
      await expect(row).not.toBeVisible()
      await expect(page.getByText("Artikel dihapus dari riwayat")).toBeVisible()

      expect(await getReadingHistoryRaw(editorId, article.id)).toBeNull()
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Clear all history — native confirm", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  test("accepting the confirm dialog clears all rows and shows the empty state", async ({ page }) => {
    const runId = newRunId()
    const articles = []
    for (let i = 0; i < 3; i++) {
      articles.push(
        await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: `hist-clear-accept-${i}`, runId })
      )
    }
    try {
      for (const a of articles) await seedReadingHistory(editorId, a.id)
      await page.goto("/dashboard/history")
      await expect(page.getByRole("button", { name: "Hapus Semua" })).toBeVisible()

      page.once("dialog", (dialog) => dialog.accept())
      await page.getByRole("button", { name: "Hapus Semua" }).click()

      await expect(page.getByText("Belum ada artikel yang dibaca.")).toBeVisible()
      await expect(page.getByText("Riwayat baca dihapus")).toBeVisible()
    } finally {
      for (const a of articles) await deleteArticleById(a.id)
    }
  })

  test("dismissing the confirm dialog leaves all rows intact", async ({ page }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "hist-clear-cancel", runId })
    try {
      await seedReadingHistory(editorId, article.id)
      await page.goto("/dashboard/history")
      await expect(page.getByRole("link", { name: article.title })).toBeVisible()

      page.once("dialog", (dialog) => dialog.dismiss())
      await page.getByRole("button", { name: "Hapus Semua" }).click()

      await expect(page.getByRole("link", { name: article.title })).toBeVisible()
      expect(await getReadingHistoryRaw(editorId, article.id)).not.toBeNull()
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Empty states", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test.beforeAll(async () => {
    await deleteAllBookmarksForUser(adminId)
    await deleteAllReadingHistoryForUser(adminId)
  })

  test("/dashboard/bookmarks shows the empty-state message and explore link", async ({ page }) => {
    await page.goto("/dashboard/bookmarks")
    await expect(page.getByText("Belum ada artikel yang di-bookmark.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Jelajahi artikel →"})).toBeVisible()
  })

  test("/dashboard/history shows the empty-state message, explore link, and no Hapus Semua button", async ({
    page,
  }) => {
    await page.goto("/dashboard/history")
    await expect(page.getByText("Belum ada artikel yang dibaca.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Jelajahi artikel →"})).toBeVisible()
    await expect(page.getByRole("button", { name: "Hapus Semua" })).toHaveCount(0)
  })
})

test.describe("Pagination — bookmarks", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  const runId = newRunId()
  const articleIds: string[] = []

  test.beforeAll(async () => {
    await deleteAllBookmarksForUser(adminId)
    for (let i = 0; i < 13; i++) {
      const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: `bm-page-${i}`, runId })
      articleIds.push(article.id)
      await seedBookmark(adminId, article.id, new Date(Date.now() - i * 1000))
    }
  })

  test.afterAll(async () => {
    for (const id of articleIds) await deleteArticleById(id)
  })

  test("page 1 shows 12 of 13 bookmarks with a Berikutnya link", async ({ page }) => {
    await page.goto("/dashboard/bookmarks")
    await expect(page.locator(".divide-y > div")).toHaveCount(12)
    await expect(page.getByRole("link", { name: "Berikutnya" })).toBeVisible()
  })

  test("page 2 shows the remaining bookmark", async ({ page }) => {
    await page.goto("/dashboard/bookmarks?page=2")
    await expect(page.locator(".divide-y > div")).toHaveCount(1)
  })
})

test.describe("Pagination — reading history", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  const runId = newRunId()
  const articleIds: string[] = []

  test.beforeAll(async () => {
    await deleteAllReadingHistoryForUser(adminId)
    for (let i = 0; i < 13; i++) {
      const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: `hist-page-${i}`, runId })
      articleIds.push(article.id)
      await seedReadingHistory(adminId, article.id, new Date(Date.now() - i * 1000))
    }
  })

  test.afterAll(async () => {
    for (const id of articleIds) await deleteArticleById(id)
  })

  test("page 1 shows 12 of 13 history items with a Berikutnya link", async ({ page }) => {
    await page.goto("/dashboard/history")
    await expect(page.locator(".divide-y > div")).toHaveCount(12)
    await expect(page.getByRole("link", { name: "Berikutnya" })).toBeVisible()
  })

  test("page 2 shows the remaining item", async ({ page }) => {
    await page.goto("/dashboard/history?page=2")
    await expect(page.locator(".divide-y > div")).toHaveCount(1)
  })
})

test.describe("Invalid ?page= parameter", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  for (const rawPage of ["abc", "0", "1e21"]) {
    test(`page=${rawPage} falls back gracefully on /dashboard/bookmarks`, async ({ page }) => {
      const res = await page.goto(`/dashboard/bookmarks?page=${encodeURIComponent(rawPage)}`)
      expect(res?.status()).toBe(200)
      await expect(page.getByRole("heading", { name: "Bookmark Saya" })).toBeVisible()
    })

    test(`page=${rawPage} falls back gracefully on /dashboard/history`, async ({ page }) => {
      const res = await page.goto(`/dashboard/history?page=${encodeURIComponent(rawPage)}`)
      expect(res?.status()).toBe(200)
      await expect(page.getByRole("heading", { name: "Riwayat Baca" })).toBeVisible()
    })
  }
})

