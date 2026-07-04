import "dotenv/config"
import { test, expect, request } from "@playwright/test"
import {
  seedArticleAtStatus,
  deleteArticleById,
  getArticleRaw,
  getUserIdByEmail,
  snapshotFeaturedState,
  restoreFeaturedState,
  updateArticleScheduledAt,
  countFeaturedAmong,
} from "./utils/db"
import { newRunId } from "./utils/ids"

const BASE_URL = "http://localhost:3000"

function minutesFromNow(mins: number): string {
  const d = new Date(Date.now() + mins * 60_000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

let journalistUserId: string

test.beforeAll(async () => {
  journalistUserId = await getUserIdByEmail("farhan@newsportaljournalist.com")
})

test.describe("Create -> edit -> submit for review", () => {
  test.use({ storageState: "e2e/.auth/journalist.json" })

  test("journalist creates a draft via the real UI, then submits it for review", async ({ page }) => {
    const runId = newRunId()
    const title = `[E2E] create-flow ${runId}`
    let articleId = ""

    try {
      await page.goto("/dashboard/articles/new")
      await page.locator('input[name="title"]').fill(title)
      await page.locator('select[name="categoryId"]').selectOption({ index: 1 })
      await page.locator('textarea[name="excerpt"]').fill("Ringkasan artikel uji coba end-to-end.")
      await page.locator("label.cursor-pointer").first().click()
      await page.locator(".article-content .ProseMirror").click()
      await page.keyboard.type("Ini adalah isi artikel uji coba end-to-end.")

      await page.getByRole("button", { name: "Simpan Draft" }).click()
      await page.waitForURL(/\/dashboard\/articles\/[^/]+\/edit$/)
      articleId = page.url().match(/\/dashboard\/articles\/([^/]+)\/edit$/)![1]

      const draft = await getArticleRaw(articleId)
      expect(draft?.status).toBe("DRAFT")
      expect(draft?.title).toBe(title)

      await page.getByRole("button", { name: "Submit Review" }).click()
      await page.waitForURL(/\/dashboard\/articles$/)

      const submitted = await getArticleRaw(articleId)
      expect(submitted?.status).toBe("REVIEW")
    } finally {
      if (articleId) await deleteArticleById(articleId)
    }
  })
})

test.describe("Approve", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  test("approving publishes the article and makes it publicly visible", async ({ page, browser }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistUserId, "REVIEW", { scenario: "approve", runId })

    try {
      await page.goto(`/dashboard/review/${article.id}`)
      await page.getByRole("button", { name: "Setujui" }).click()
      await page.getByRole("button", { name: "Konfirmasi Setujui" }).click()
      await page.waitForURL(/\/dashboard\/review$/)

      const published = await getArticleRaw(article.id)
      expect(published?.status).toBe("PUBLISHED")
      expect(published?.publishedAt).not.toBeNull()
      expect(published?.rejectionNote).toBeNull()

      // Explicit empty storageState: browser.newContext() otherwise inherits this describe
      // block's test.use({storageState: "editor.json"}) as its default.
      const visitorContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const visitorPage = await visitorContext.newPage()
      const response = await visitorPage.goto(`/article/${article.slug}`)
      expect(response?.status()).toBe(200)
      await visitorContext.close()
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Reject + resubmit", () => {
  test("editor rejects with a note, journalist sees it and resubmits", async ({ browser }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistUserId, "REVIEW", { scenario: "reject", runId })
    const rejectionNote = "Mohon perbaiki judul dan tambahkan kutipan sumber."

    try {
      const editorContext = await browser.newContext({ storageState: "e2e/.auth/editor.json" })
      const editorPage = await editorContext.newPage()
      await editorPage.goto(`/dashboard/review/${article.id}`)
      await editorPage.getByRole("button", { name: "Tolak" }).click()
      await editorPage.getByPlaceholder("Catatan penolakan (wajib)...").fill(rejectionNote)
      await editorPage.getByRole("button", { name: "Konfirmasi Tolak" }).click()
      await editorPage.waitForURL(/\/dashboard\/review$/)
      await editorContext.close()

      const rejected = await getArticleRaw(article.id)
      expect(rejected?.status).toBe("REJECTED")
      expect(rejected?.rejectionNote).toBe(rejectionNote)

      const journalistContext = await browser.newContext({ storageState: "e2e/.auth/journalist.json" })
      const journalistPage = await journalistContext.newPage()
      await journalistPage.goto(`/dashboard/articles/${article.id}/edit`)
      await expect(journalistPage.getByText("Catatan Penolakan")).toBeVisible()
      await expect(journalistPage.getByText(rejectionNote)).toBeVisible()

      await journalistPage.getByRole("button", { name: "Submit Review" }).click()
      await journalistPage.waitForURL(/\/dashboard\/articles$/)
      await journalistContext.close()

      const resubmitted = await getArticleRaw(article.id)
      expect(resubmitted?.status).toBe("REVIEW")
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Schedule + cron", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  test("scheduled article stays hidden until the cron endpoint fires", async ({ page, browser }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistUserId, "REVIEW", { scenario: "schedule", runId })

    try {
      await page.goto(`/dashboard/review/${article.id}`)
      await page.getByRole("button", { name: "Jadwalkan" }).click()
      await page.locator('input[type="datetime-local"]').fill(minutesFromNow(2))
      await page.getByRole("button", { name: "Konfirmasi Jadwal" }).click()
      await page.waitForURL(/\/dashboard\/review$/)

      const scheduled = await getArticleRaw(article.id)
      expect(scheduled?.status).toBe("SCHEDULED")

      // Explicit empty storageState: browser.newContext() otherwise inherits this describe
      // block's test.use({storageState: "editor.json"}) as its default.
      const visitorContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const visitorPage = await visitorContext.newPage()
      await visitorPage.goto(`/article/${article.slug}`)
      // `next dev` reports HTTP 200 for a rendered notFound() page (confirmed correct 404 in
      // production builds) — assert on the rendered not-found content instead of raw status.
      await expect(visitorPage.getByRole("heading", { name: "Halaman Tidak Ditemukan" })).toBeVisible()

      // Simulate the cron firing: rewrite scheduledAt into the past, then hit the cron endpoint directly.
      await updateArticleScheduledAt(article.id, new Date(Date.now() - 60_000))
      const cronContext = await request.newContext({ baseURL: BASE_URL })
      const cronRes = await cronContext.get("/api/cron/publish-scheduled", {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
      expect(cronRes.ok()).toBe(true)
      const cronBody = await cronRes.json()
      expect(cronBody.published).toBeGreaterThanOrEqual(1)
      await cronContext.dispose()

      const nowPublished = await visitorPage.goto(`/article/${article.slug}`)
      expect(nowPublished?.status()).toBe(200)
      await visitorContext.close()

      const dbState = await getArticleRaw(article.id)
      expect(dbState?.status).toBe("PUBLISHED")
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("TOCTOU — concurrent approve", () => {
  test("only one of two concurrent approve requests succeeds, the other gets 409", async () => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistUserId, "REVIEW", { scenario: "toctou", runId })

    try {
      const ctxA = await request.newContext({ storageState: "e2e/.auth/editor.json", baseURL: BASE_URL })
      const ctxB = await request.newContext({ storageState: "e2e/.auth/admin.json", baseURL: BASE_URL })

      const [resA, resB] = await Promise.all([
        ctxA.patch(`/api/articles/${article.id}/review`, { data: { action: "approve" } }),
        ctxB.patch(`/api/articles/${article.id}/review`, { data: { action: "approve" } }),
      ])

      const statuses = [resA.status(), resB.status()].sort()
      expect(statuses).toEqual([200, 409])

      const loser = resA.status() === 409 ? resA : resB
      const loserBody = await loser.json()
      expect(loserBody.error.code).toBe("CONFLICT")

      await ctxA.dispose()
      await ctxB.dispose()

      const dbState = await getArticleRaw(article.id)
      expect(dbState?.status).toBe("PUBLISHED")
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Admin override", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("admin overrides DRAFT directly to PUBLISHED, skipping REVIEW entirely", async ({ page }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistUserId, "DRAFT", { scenario: "override", runId })

    try {
      await page.goto("/dashboard/manage-articles")
      const row = page.locator(".divide-y > div").filter({ hasText: article.title })
      await row.getByRole("button", { name: "Override" }).click()

      const dialog = page.getByRole("dialog")
      await dialog.locator("select").selectOption("PUBLISHED")
      await dialog.getByRole("button", { name: "Konfirmasi Override" }).click()
      await expect(dialog).not.toBeVisible()

      const dbState = await getArticleRaw(article.id)
      expect(dbState?.status).toBe("PUBLISHED")
      expect(dbState?.publishedAt).not.toBeNull()
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Featured toggle + homepage max-3 cap", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  test("featuring 4 published articles shows only the 3 newest on the homepage", async ({ page }) => {
    const runId = newRunId()
    const originalFeaturedIds = await snapshotFeaturedState()
    const seeded: { id: string; title: string }[] = []

    try {
      for (let i = 0; i < 4; i++) {
        const a = await seedArticleAtStatus(journalistUserId, "PUBLISHED", {
          scenario: `featured-cap-${i}`,
          runId,
          publishedAt: new Date(Date.now() - i * 60_000),
        })
        seeded.push({ id: a.id, title: a.title })
      }

      await page.goto("/dashboard/manage-articles")
      for (const article of seeded) {
        const row = page.locator(".divide-y > div").filter({ hasText: article.title })
        await row.getByRole("button", { name: "☆ Featured" }).click()
        await expect(row.getByRole("button", { name: "★ Featured" })).toBeVisible()
      }

      const dbCount = await countFeaturedAmong(seeded.map((a) => a.id))
      expect(dbCount).toBe(4)

      await page.goto("/")
      const featuredSection = page.locator('section[aria-label="Berita Utama"]')
      // The homepage streams this section in via Suspense (see FeaturedWrapper in src/app/page.tsx)
      // — wait for real content before asserting, since goto() only waits for the initial document,
      // not for suspended content to finish streaming in.
      await expect(featuredSection.getByRole("heading", { name: "Berita Utama" })).toBeVisible()

      // Newest 3 (indices 0,1,2) should be present; the oldest (index 3) should not — this also
      // proves the cap is exactly 3, since a 4th slot appearing would make seeded[3] visible too.
      for (const article of seeded.slice(0, 3)) {
        await expect(featuredSection.getByText(article.title)).toBeVisible()
      }
      await expect(featuredSection.getByText(seeded[3].title)).not.toBeVisible()
    } finally {
      await restoreFeaturedState(originalFeaturedIds, seeded.map((a) => a.id))
      for (const article of seeded) await deleteArticleById(article.id)
    }
  })
})
