import "dotenv/config"
import { test, expect, request, type Page } from "@playwright/test"
import { subDays } from "date-fns"
import {
  getUserIdByEmail,
  getUserByEmail,
  deleteThrowawayUser,
  seedArticleAtStatus,
  deleteArticleById,
  seedArticleView,
  seedArticleViews,
} from "./utils/db"
import { newRunId } from "./utils/ids"

const BASE_URL = "http://localhost:3000"

let journalistId: string

test.beforeAll(async () => {
  journalistId = await getUserIdByEmail("farhan@newsportaljournalist.com")
})

// .toLocaleString("id-ID") uses period as the thousands separator ("1.205"), not comma.
function parseIdNumber(text: string): number {
  return parseInt(text.replace(/\./g, ""), 10)
}

async function readStatCard(page: Page, label: string): Promise<number> {
  const dl = page.locator("dl").filter({ hasText: label })
  const text = await dl.locator("dd").first().textContent()
  return parseIdNumber((text ?? "0").trim())
}

function withFakeIp(ip: string) {
  return { "x-forwarded-for": ip }
}

test.describe("Summary stats — cache-busted delta", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("seeding a published article + views increases Total Artikel/Artikel Published/Total Views by exactly the expected delta", async ({
    page,
  }) => {
    const runId = newRunId()
    const K = 12
    const article = await seedArticleAtStatus(journalistId, "DRAFT", { scenario: "an-summary", runId })
    try {
      // Force a fresh, correct baseline first: a prior test run's cleanup (deleting its own
      // fixtures) never re-busts the "analytics" cache, so ambient cache state can be stale
      // relative to current DB truth. A no-op DRAFT->DRAFT override is still a valid status
      // transition (route has no precondition) and unconditionally busts the cache, guaranteeing
      // the "before" read below reflects reality (including this article, already seeded, but
      // not yet published or view-counted).
      const noop = await page.request.patch(`/api/articles/${article.id}/override`, {
        data: { status: "DRAFT" },
      })
      expect(noop.status()).toBe(200)

      await page.goto("/dashboard/analytics")
      const beforeArticles = await readStatCard(page, "Total Artikel")
      const beforePublished = await readStatCard(page, "Artikel Published")
      const beforeViews = await readStatCard(page, "Total Views")

      // Seed all data first, then bust the "analytics" cache exactly once via Override
      // (unconditional revalidateTag, not rate-limited) — raw-SQL seeding alone never
      // triggers revalidation.
      await seedArticleViews(article.id, K)
      const res = await page.request.patch(`/api/articles/${article.id}/override`, {
        data: { status: "PUBLISHED" },
      })
      expect(res.status()).toBe(200)

      await page.goto("/dashboard/analytics")
      const afterArticles = await readStatCard(page, "Total Artikel")
      const afterPublished = await readStatCard(page, "Artikel Published")
      const afterViews = await readStatCard(page, "Total Views")

      // Total Artikel is unchanged — the article already existed (as DRAFT) at the "before"
      // read, only its status/view-count changed afterward.
      expect(afterArticles).toBe(beforeArticles)
      expect(afterPublished).toBe(beforePublished + 1)
      expect(afterViews).toBe(beforeViews + K)
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Top articles — ranking, formatting, date-range filtering", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  const runId = newRunId()
  let dominantId: string
  let dominantTitle: string
  let decoyId: string
  let decoyTitle: string
  let draftId: string
  let draftTitle: string

  test.beforeAll(async () => {
    const dominant = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "an-top-dominant", runId })
    dominantId = dominant.id
    dominantTitle = dominant.title
    const decoy = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "an-top-decoy", runId })
    decoyId = decoy.id
    decoyTitle = decoy.title
    const draft = await seedArticleAtStatus(journalistId, "DRAFT", { scenario: "an-top-draft", runId })
    draftId = draft.id
    draftTitle = draft.title

    // Seed everything first: dominant gets a large "now" batch + one boundary view 8 days
    // ago (1205 within 7d, 1206 within 30d/all); decoy gets fewer views for ordering; draft
    // gets MORE views than everyone to prove the status:"PUBLISHED" filter still excludes it.
    await seedArticleViews(dominantId, 1205)
    await seedArticleView(dominantId, subDays(new Date(), 8))
    // Decoy must still comfortably outrank ambient dev-DB noise to land in the top 10 at all —
    // 20 views proved too small in practice (crowded out by real traffic accumulated over the
    // project's lifetime); 700 stays reliably visible while remaining clearly < dominant's ~1206.
    await seedArticleViews(decoyId, 700)
    await seedArticleViews(draftId, 5000)

    // Bust "analytics" exactly once, after all seeding above (no page/request fixture exists
    // in beforeAll, so use a standalone APIRequestContext).
    const ctx = await request.newContext({ storageState: "e2e/.auth/admin.json", baseURL: BASE_URL })
    try {
      const res = await ctx.patch(`/api/articles/${dominantId}/override`, { data: { status: "PUBLISHED" } })
      expect(res.status()).toBe(200)
    } finally {
      await ctx.dispose()
    }
  })

  test.afterAll(async () => {
    await deleteArticleById(dominantId)
    await deleteArticleById(decoyId)
    await deleteArticleById(draftId)
  })

  test("dominant article ranks above a lower-view decoy in ?range=all, Views formatted with id-ID thousands separator", async ({
    page,
  }) => {
    await page.goto("/dashboard/analytics?range=all")
    const dominantRow = page.locator("tbody tr").filter({ hasText: dominantTitle })
    const decoyRow = page.locator("tbody tr").filter({ hasText: decoyTitle })
    await expect(dominantRow).toBeVisible()
    await expect(decoyRow).toBeVisible()

    const viewsText = await dominantRow.locator("td").last().textContent()
    expect(viewsText?.trim()).toBe("1.206")

    const titles = await page.locator("tbody tr td:nth-child(2)").allTextContents()
    const dominantIndex = titles.findIndex((t) => t.includes(dominantTitle))
    const decoyIndex = titles.findIndex((t) => t.includes(decoyTitle))
    expect(dominantIndex).toBeGreaterThanOrEqual(0)
    expect(decoyIndex).toBeGreaterThan(dominantIndex)
  })

  test("?range=7d excludes the 8-day-old view", async ({ page }) => {
    await page.goto("/dashboard/analytics?range=7d")
    const dominantRow = page.locator("tbody tr").filter({ hasText: dominantTitle })
    const viewsText = await dominantRow.locator("td").last().textContent()
    expect(viewsText?.trim()).toBe("1.205")
  })

  test("?range=30d includes the 8-day-old view", async ({ page }) => {
    await page.goto("/dashboard/analytics?range=30d")
    const dominantRow = page.locator("tbody tr").filter({ hasText: dominantTitle })
    const viewsText = await dominantRow.locator("td").last().textContent()
    expect(viewsText?.trim()).toBe("1.206")
  })

  test("a DRAFT article with more views than everyone never appears in the table, in any range", async ({
    page,
  }) => {
    for (const range of ["7d", "30d", "all"]) {
      await page.goto(`/dashboard/analytics?range=${range}`)
      await expect(page.locator("tbody tr").filter({ hasText: draftTitle })).toHaveCount(0)
    }
  })
})

test.describe("?range= invalid/missing fallback", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  for (const rawRange of ["bogus", "", "7"]) {
    test(`range=${rawRange || "(empty)"} falls back to 7 Hari`, async ({ page }) => {
      await page.goto(`/dashboard/analytics?range=${encodeURIComponent(rawRange)}`)
      await expect(page.getByRole("link", { name: "7 Hari" })).toHaveAttribute("aria-current", "true")
    })
  }

  test("omitting ?range= entirely defaults to 7 Hari", async ({ page }) => {
    await page.goto("/dashboard/analytics")
    await expect(page.getByRole("link", { name: "7 Hari" })).toHaveAttribute("aria-current", "true")
  })
})

test.describe("New Users chart — EDITOR content hiding", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  test("EDITOR never sees the Pengguna Baru per Minggu heading or chart", async ({ page }) => {
    await page.goto("/dashboard/analytics")
    await expect(page.getByRole("heading", { name: "Pengguna Baru per Minggu" })).toHaveCount(0)
    await expect(
      page.getByRole("img", { name: "Grafik pengguna baru per minggu (12 minggu terakhir)" })
    ).toHaveCount(0)
  })
})

test.describe("New Users chart — ADMIN structure", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("ADMIN sees exactly 12 bars, correct aria wiring, only every-3rd + last x-axis labels visible", async ({
    page,
  }) => {
    await page.goto("/dashboard/analytics")
    const chart = page.getByRole("img", { name: "Grafik pengguna baru per minggu (12 minggu terakhir)" })
    await expect(chart).toBeVisible()

    const barsContainer = chart.locator("> div").first()
    await expect(barsContainer).toHaveAttribute("aria-hidden", "true")
    const bars = barsContainer.locator("> div")
    await expect(bars).toHaveCount(12)

    const labels = chart.locator("> div").nth(1).locator("> div")
    await expect(labels).toHaveCount(12)

    for (let i = 0; i < 12; i++) {
      const shouldBeVisible = i % 3 === 0 || i === 11
      if (shouldBeVisible) {
        await expect(labels.nth(i)).toBeVisible()
      } else {
        await expect(labels.nth(i)).not.toBeVisible()
      }
    }
  })
})

test.describe("New Users chart — cache-busted bucket delta", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("registering one new user increases the current week's bar count by exactly 1", async ({ page, browser }) => {
    async function readLastBarCount(): Promise<number> {
      await page.goto("/dashboard/analytics")
      const lastBar = page
        .getByRole("img", { name: "Grafik pengguna baru per minggu (12 minggu terakhir)" })
        .locator("> div")
        .first()
        .locator("> div")
        .last()
      await lastBar.hover()
      const text = await lastBar.locator("span").textContent()
      return parseInt(text ?? "0", 10)
    }

    // Genuinely anonymous context required — browser.newContext() without explicit empty
    // storageState silently inherits this describe's test.use({storageState: admin.json}),
    // which would redirect /register straight back to "/" for an already-logged-in session.
    async function registerThrowawayUser(): Promise<string> {
      const anonContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      await anonContext.setExtraHTTPHeaders(withFakeIp("10.30.30.1"))
      const runId = newRunId()
      const email = `e2e-an-chart-${runId}@test.newsportal.local`
      try {
        const registerPage = await anonContext.newPage()
        await registerPage.goto("/register")
        await registerPage.locator("#name").fill("E2E Analytics Chart")
        await registerPage.locator("#email").fill(email)
        await registerPage.locator("#password").fill("Password123")
        await registerPage.getByRole("button", { name: "Daftar →" }).click()
        await registerPage.waitForURL("/")
      } finally {
        await anonContext.close()
      }
      return email
    }

    const emails: string[] = []
    try {
      // A prior test run's cleanup never re-busts "analytics-users" after deleting its own
      // throwaway user, so ambient cache state can be stale relative to current DB truth.
      // Register once first purely to force a fresh, correct baseline, then again as the
      // actual delta under test — both on the same dedicated fake IP (2 of 5 req/15min budget).
      emails.push(await registerThrowawayUser())
      const before = await readLastBarCount()

      emails.push(await registerThrowawayUser())
      const after = await readLastBarCount()

      expect(after).toBe(before + 1)
    } finally {
      for (const email of emails) {
        const user = await getUserByEmail(email)
        if (user) await deleteThrowawayUser(user.id)
      }
    }
  })
})
