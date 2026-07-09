import "dotenv/config"
import { test, expect, type Page } from "@playwright/test"
import { subDays } from "date-fns"
import {
  getUserIdByEmail,
  createThrowawayCategory,
  deleteCategoryById,
  createThrowawayTag,
  deleteTagById,
  attachTagToArticle,
  seedArticleAtStatus,
  deleteArticleById,
} from "./utils/db"
import { newRunId } from "./utils/ids"

let journalistId: string

test.beforeAll(async () => {
  journalistId = await getUserIdByEmail("farhan@newsportaljournalist.com")
})

// getSearchRateLimiter() (30 req/1-min) keys on IP, and Playwright's requests carry no
// x-forwarded-for by default — every request in this file would otherwise share one bucket
// ("search:unknown") and 429 once cumulative volume crosses 30/min. Give each describe block its
// own fake IP so its own request volume (well under 30) never competes with any other describe's.
function withFakeIp(ip: string) {
  return { "x-forwarded-for": ip }
}

// FilterPanel renders "Semua" twice (category reset button AND the first date preset) — a bare
// getByRole("button", { name: "Semua" }) strict-mode-fails with 2 matches. Scope to the section.
function categorySection(page: Page) {
  return page.getByText("Kategori", { exact: true }).locator("xpath=..")
}
function tagSection(page: Page) {
  return page.getByText("Tag", { exact: true }).locator("xpath=..")
}

test.describe("Text search", () => {
  test.beforeEach(async ({ context }) => {
    await context.setExtraHTTPHeaders(withFakeIp("10.10.10.1"))
  })

  const runId = newRunId()
  const caseSuffix = runId.slice(-6)
  const titleWord = `SearchTok${caseSuffix.toUpperCase()}`
  let categoryId: string
  let articleId: string

  test.beforeAll(async () => {
    const category = await createThrowawayCategory({ scenario: "search-text", runId })
    categoryId = category.id
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", {
      scenario: "search-text",
      runId,
      title: `[E2E] search-text ${titleWord} ${runId}`,
      categoryId,
    })
    articleId = article.id
  })

  test.afterAll(async () => {
    await deleteArticleById(articleId)
    await deleteCategoryById(categoryId)
  })

  test("typing a search query returns only the matching article", async ({ page }) => {
    await page.goto("/search")
    await page.getByRole("searchbox", { name: "Cari artikel" }).fill(titleWord)
    await expect(page.getByText(`Menampilkan 1 dari 1 artikel`)).toBeVisible()
  })

  test("search text is matched case-insensitively", async ({ page }) => {
    await page.goto("/search")
    await page.getByRole("searchbox", { name: "Cari artikel" }).fill(titleWord.toLowerCase())
    await expect(page.getByText(`Menampilkan 1 dari 1 artikel`)).toBeVisible()
  })

  test("debounce coalesces rapid keystrokes into a single API request", async ({ page }) => {
    const requests: string[] = []
    page.on("request", (req) => {
      if (req.url().includes("/api/articles")) requests.push(req.url())
    })

    await page.goto("/search")
    await page.waitForResponse((r) => r.url().includes("/api/articles"))
    requests.length = 0

    await page.getByRole("searchbox", { name: "Cari artikel" }).pressSequentially("hello", { delay: 50 })
    // Debounce is 300ms after the last keystroke — wait for the settled request itself rather
    // than a fixed timeout, so this isn't sensitive to Next.js dev-server compile-time variance.
    await page.waitForResponse((r) => r.url().includes("/api/articles"), { timeout: 10_000 })

    expect(requests.length).toBe(1)
  })

  test("typing pushes a new history entry (back button reverts the search text)", async ({ page }) => {
    await page.goto("/search")
    await page.getByRole("searchbox", { name: "Cari artikel" }).fill(titleWord)
    await expect(page).toHaveURL(/q=/)

    await page.goBack()
    await expect(page).not.toHaveURL(/q=/)
  })

  test("a query with no matches shows the query-specific empty state", async ({ page }) => {
    const nonsense = `zzznonexistent${runId}`
    await page.goto(`/search?q=${nonsense}`)
    await expect(page.getByText("Tidak ada hasil ditemukan")).toBeVisible()
    await expect(page.getByText(`Tidak ada artikel yang cocok dengan "${nonsense}"`)).toBeVisible()
  })
})

test.describe("Category / tag / date filter combinability", () => {
  test.beforeEach(async ({ context }) => {
    await context.setExtraHTTPHeaders(withFakeIp("10.10.10.2"))
  })

  const runId = newRunId()
  const sharedToken = `combotok${runId.slice(-8)}`
  let categoryAId: string
  let categoryASlug: string
  let categoryBId: string
  let tagId: string
  let tagSlug: string
  let articleMatchId: string
  let articleWrongCategoryId: string
  let articleNoTagId: string
  let articleOldDateId: string

  test.beforeAll(async () => {
    const categoryA = await createThrowawayCategory({ scenario: "search-combo-a", runId })
    categoryAId = categoryA.id
    categoryASlug = categoryA.slug
    const categoryB = await createThrowawayCategory({ scenario: "search-combo-b", runId })
    categoryBId = categoryB.id

    const tag = await createThrowawayTag({ scenario: "search-combo", runId, name: `[E2E]combo${runId.slice(-8)}` })
    tagId = tag.id
    tagSlug = tag.slug

    const now = new Date()
    const eightDaysAgo = subDays(now, 8)

    const articleMatch = await seedArticleAtStatus(journalistId, "PUBLISHED", {
      scenario: "search-combo-match",
      runId,
      title: `[E2E] search-combo-match ${sharedToken}`,
      categoryId: categoryAId,
      publishedAt: now,
    })
    articleMatchId = articleMatch.id
    await attachTagToArticle(articleMatchId, tagId)

    const articleWrongCategory = await seedArticleAtStatus(journalistId, "PUBLISHED", {
      scenario: "search-combo-wrongcat",
      runId,
      title: `[E2E] search-combo-wrongcat ${sharedToken}`,
      categoryId: categoryBId,
      publishedAt: now,
    })
    articleWrongCategoryId = articleWrongCategory.id
    await attachTagToArticle(articleWrongCategoryId, tagId)

    const articleNoTag = await seedArticleAtStatus(journalistId, "PUBLISHED", {
      scenario: "search-combo-notag",
      runId,
      title: `[E2E] search-combo-notag ${sharedToken}`,
      categoryId: categoryAId,
      publishedAt: now,
    })
    articleNoTagId = articleNoTag.id

    const articleOldDate = await seedArticleAtStatus(journalistId, "PUBLISHED", {
      scenario: "search-combo-olddate",
      runId,
      title: `[E2E] search-combo-olddate ${sharedToken}`,
      categoryId: categoryAId,
      publishedAt: eightDaysAgo,
    })
    articleOldDateId = articleOldDate.id
    await attachTagToArticle(articleOldDateId, tagId)
  })

  test.afterAll(async () => {
    await deleteArticleById(articleMatchId)
    await deleteArticleById(articleWrongCategoryId)
    await deleteArticleById(articleNoTagId)
    await deleteArticleById(articleOldDateId)
    await deleteTagById(tagId)
    await deleteCategoryById(categoryAId)
    await deleteCategoryById(categoryBId)
  })

  test("search text alone matches all 4 seeded articles", async ({ request }) => {
    const res = await request.get(`/api/articles?search=${sharedToken}`, { headers: withFakeIp("10.10.10.2") })
    expect((await res.json()).meta.total).toBe(4)
  })

  test("category filter narrows results to that category (3 of 4)", async ({ request }) => {
    const res = await request.get(`/api/articles?search=${sharedToken}&category=${categoryASlug}`, {
      headers: withFakeIp("10.10.10.2"),
    })
    expect((await res.json()).meta.total).toBe(3)
  })

  test("category + tag combined narrows results further (2 of 4)", async ({ request }) => {
    const res = await request.get(`/api/articles?search=${sharedToken}&category=${categoryASlug}&tag=${tagSlug}`, {
      headers: withFakeIp("10.10.10.2"),
    })
    expect((await res.json()).meta.total).toBe(2)
  })

  test("date preset 7d excludes the article published 8 days ago", async ({ request }) => {
    const res = await request.get(`/api/articles?search=${sharedToken}&date=7d`, { headers: withFakeIp("10.10.10.2") })
    const json = await res.json()
    expect(json.meta.total).toBe(3)
    expect(json.data.map((a: { id: string }) => a.id)).not.toContain(articleOldDateId)
  })

  test("date preset 30d includes the 8-day-old article", async ({ request }) => {
    const res = await request.get(`/api/articles?search=${sharedToken}&date=30d`, {
      headers: withFakeIp("10.10.10.2"),
    })
    const json = await res.json()
    expect(json.meta.total).toBe(4)
    expect(json.data.map((a: { id: string }) => a.id)).toContain(articleOldDateId)
  })

  test("search + category + tag + date=7d narrows to exactly one article (DOM + API)", async ({ page, request }) => {
    const res = await request.get(
      `/api/articles?search=${sharedToken}&category=${categoryASlug}&tag=${tagSlug}&date=7d`,
      { headers: withFakeIp("10.10.10.2") }
    )
    const json = await res.json()
    expect(json.meta.total).toBe(1)
    expect(json.data[0].id).toBe(articleMatchId)

    await page.goto(`/search?q=${sharedToken}&category=${categoryASlug}&tag=${tagSlug}&date=7d`)
    await expect(page.getByText("Menampilkan 1 dari 1 artikel")).toBeVisible({ timeout: 15000 })
  })

  test("clicking a selected category button again deselects it (toggle-off)", async ({ page }) => {
    await page.goto(`/search?q=${sharedToken}`)
    const catButton = categorySection(page).getByRole("button", { name: /search-combo-a/ })
    await catButton.click()
    await expect(page).toHaveURL(new RegExp(`category=${categoryASlug}`))

    await catButton.click()
    await expect(page).not.toHaveURL(/category=/)
  })

  test("clicking a selected tag button again deselects it (toggle-off)", async ({ page }) => {
    await page.goto(`/search?q=${sharedToken}`)
    const tagButton = tagSection(page).getByRole("button", { name: new RegExp(`#.*combo`) })
    await tagButton.click()
    await expect(page).toHaveURL(new RegExp(`tag=${tagSlug}`))

    await tagButton.click()
    await expect(page).not.toHaveURL(/tag=/)
  })

  test('"Semua" always resets category, even when a category is already selected', async ({ page }) => {
    await page.goto(`/search?q=${sharedToken}&category=${categoryASlug}`)
    await expect(page).toHaveURL(/category=/)

    const semuaButton = categorySection(page).getByRole("button", { name: "Semua" })
    await semuaButton.click()
    await expect(page).not.toHaveURL(/category=/)

    // Idempotent — clicking "Semua" again does not toggle a category back on.
    await semuaButton.click()
    await expect(page).not.toHaveURL(/category=/)
  })

  test("changing a filter uses history.replace (back button skips over the filter change)", async ({ page }) => {
    await page.goto("/search")
    await page.getByRole("searchbox", { name: "Cari artikel" }).fill(sharedToken)
    await expect(page).toHaveURL(/q=/)

    await categorySection(page).getByRole("button", { name: /search-combo-a/ }).click()
    await expect(page).toHaveURL(/category=/)
    await expect(page).toHaveURL(/q=/)

    await page.goBack()
    await expect(page).not.toHaveURL(/q=/)
    await expect(page).not.toHaveURL(/category=/)
  })
})

test.describe("Pagination with active filters", () => {
  test.beforeEach(async ({ context }) => {
    await context.setExtraHTTPHeaders(withFakeIp("10.10.10.3"))
  })

  const runId = newRunId()
  let categoryId: string
  let categorySlug: string
  const articleIds: string[] = []

  test.beforeAll(async () => {
    const category = await createThrowawayCategory({ scenario: "search-pag", runId })
    categoryId = category.id
    categorySlug = category.slug

    for (let i = 0; i < 13; i++) {
      const article = await seedArticleAtStatus(journalistId, "PUBLISHED", {
        scenario: `search-pag-${i}`,
        runId,
        categoryId,
      })
      articleIds.push(article.id)
    }
  })

  test.afterAll(async () => {
    for (const id of articleIds) await deleteArticleById(id)
    await deleteCategoryById(categoryId)
  })

  test("a filtered category with >12 results shows pagination controls", async ({ page }) => {
    await page.goto(`/search?category=${categorySlug}`)
    await expect(page.getByText("Menampilkan 12 dari 13 artikel")).toBeVisible()
    await expect(page.getByRole("link", { name: "Berikutnya" })).toBeVisible()
  })

  test("the next-page link preserves the active category filter in its href", async ({ page }) => {
    await page.goto(`/search?category=${categorySlug}`)
    const nextLink = page.getByRole("link", { name: "Berikutnya" })
    const href = await nextLink.getAttribute("href")
    expect(href).toContain(`category=${categorySlug}`)
    expect(href).toContain("page=2")
  })

  test("navigating to page 2 keeps the filter applied (DOM + API meta.page)", async ({ page, request }) => {
    await page.goto(`/search?category=${categorySlug}`)
    await page.getByRole("link", { name: "Berikutnya" }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByText("Menampilkan 1 dari 13 artikel")).toBeVisible()

    const res = await request.get(`/api/articles?category=${categorySlug}&page=2`, {
      headers: withFakeIp("10.10.10.3"),
    })
    const json = await res.json()
    expect(json.meta.page).toBe(2)
    expect(json.meta.total).toBe(13)
    expect(json.meta.totalPages).toBe(2)
  })
})

test.describe("Invalid / out-of-range page parameter (API-level)", () => {
  const runId = newRunId()
  let categoryId: string
  let categorySlug: string
  let articleId: string

  test.beforeAll(async () => {
    const category = await createThrowawayCategory({ scenario: "search-inv", runId })
    categoryId = category.id
    categorySlug = category.slug
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", { scenario: "search-inv", runId, categoryId })
    articleId = article.id
  })

  test.afterAll(async () => {
    await deleteArticleById(articleId)
    await deleteCategoryById(categoryId)
  })

  for (const rawPage of ["abc", "0", "-5", "1.5", "1e21", "Infinity"]) {
    test(`page=${rawPage} silently falls back to page 1`, async ({ request }) => {
      const res = await request.get(`/api/articles?category=${categorySlug}&page=${encodeURIComponent(rawPage)}`, {
        headers: withFakeIp("10.10.10.4"),
      })
      const json = await res.json()
      expect(json.meta.page).toBe(1)
      expect(json.meta.total).toBe(1)
      expect(json.data.length).toBe(1)
    })
  }

  test("a page beyond totalPages returns an empty data array without erroring", async ({ request }) => {
    const res = await request.get(`/api/articles?category=${categorySlug}&page=9999`, {
      headers: withFakeIp("10.10.10.4"),
    })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.meta.page).toBe(9999)
    expect(json.meta.total).toBe(1)
    expect(json.meta.totalPages).toBe(1)
    expect(json.data.length).toBe(0)
  })
})

test.describe("Empty state text variants", () => {
  test.beforeEach(async ({ context }) => {
    await context.setExtraHTTPHeaders(withFakeIp("10.10.10.5"))
  })

  test("unmatched search query shows the quoted-query empty message", async ({ page }) => {
    const runId = newRunId()
    const nonsense = `zzzunmatched${runId}`
    await page.goto(`/search?q=${nonsense}`)
    await expect(page.getByText(`Tidak ada artikel yang cocok dengan "${nonsense}"`)).toBeVisible()
  })

  test("a filter-only combination with no matches shows the non-quoted empty message", async ({ page }) => {
    const runId = newRunId()
    const category = await createThrowawayCategory({ scenario: "search-empty", runId })
    try {
      await page.goto(`/search?category=${category.slug}`)
      await expect(page.getByText("Tidak ada artikel yang cocok dengan filter yang dipilih.")).toBeVisible()
    } finally {
      await deleteCategoryById(category.id)
    }
  })
})

test.describe("GET /api/articles — public contract", () => {
  test("is public, no auth required", async ({ request }) => {
    const res = await request.get("/api/articles", { headers: withFakeIp("10.10.10.6") })
    expect(res.status()).toBe(200)
  })

  test("response shape matches { data, meta: { total, page, totalPages, perPage } }", async ({ request }) => {
    const res = await request.get("/api/articles", { headers: withFakeIp("10.10.10.6") })
    const json = await res.json()
    expect(Array.isArray(json.data)).toBe(true)
    expect(typeof json.meta.total).toBe("number")
    expect(typeof json.meta.page).toBe("number")
    expect(typeof json.meta.totalPages).toBe("number")
    expect(json.meta.perPage).toBe(12)
  })
})
