import "dotenv/config"
import { test, expect } from "@playwright/test"
import { settle, scanForViolations, formatViolations, splitByImpact } from "./utils/a11y"
import {
  getUserIdByEmail,
  createResetToken,
  createThrowawayUser,
  deleteThrowawayUser,
  seedArticleAtStatus,
  deleteArticleById,
} from "./utils/db"
import { newRunId } from "./utils/ids"

async function assertNoBlockingViolations(page: import("@playwright/test").Page) {
  await settle(page)
  const violations = await scanForViolations(page)
  const { blocking, nonBlocking } = splitByImpact(violations)
  await test.info().attach("moderate-minor-findings", {
    body: formatViolations(nonBlocking),
    contentType: "text/plain",
  })
  expect(blocking.length, formatViolations(blocking)).toBe(0)
}

test.describe("Public pages", () => {
  for (const path of ["/", "/latest", "/about", "/contact", "/search", "/login", "/register", "/forgot-password"]) {
    test(`${path} has no critical/serious a11y violations`, async ({ page }) => {
      await page.goto(path)
      await assertNoBlockingViolations(page)
    })
  }
})

test.describe("Password reset with a live token", () => {
  let userId: string
  let token: string

  test.beforeAll(async () => {
    const runId = newRunId()
    const created = await createThrowawayUser({ scenario: "a11y-reset", runId })
    userId = created.id
    token = await createResetToken(userId)
  })

  test.afterAll(async () => {
    await deleteThrowawayUser(userId)
  })

  test("/reset-password/[token] has no critical/serious a11y violations", async ({ page }) => {
    await page.goto(`/reset-password/${token}`)
    await assertNoBlockingViolations(page)
  })
})

test.describe("Dynamic public pages", () => {
  let authorId: string

  test.beforeAll(async () => {
    authorId = await getUserIdByEmail("journalist@newsportal.com")
  })

  test("/article/[slug] has no critical/serious a11y violations", async ({ page }) => {
    await page.goto("/article/revolusi-ai-mengubah-industri-media-2026")
    await assertNoBlockingViolations(page)
  })

  for (const slug of ["teknologi", "bisnis", "olahraga", "hiburan", "kesehatan", "politik"]) {
    test(`/category/${slug} has no critical/serious a11y violations`, async ({ page }) => {
      await page.goto(`/category/${slug}`)
      await assertNoBlockingViolations(page)
    })
  }

  test("/author/[id] has no critical/serious a11y violations", async ({ page }) => {
    await page.goto(`/author/${authorId}`)
    await assertNoBlockingViolations(page)
  })
})

test.describe("Dashboard, any authenticated role", () => {
  test.use({ storageState: "e2e/.auth/user.json" })

  for (const path of ["/dashboard", "/dashboard/profile", "/dashboard/security", "/dashboard/bookmarks", "/dashboard/history"]) {
    test(`${path} has no critical/serious a11y violations`, async ({ page }) => {
      await page.goto(path)
      await assertNoBlockingViolations(page)
    })
  }
})

test.describe("Dashboard, content roles", () => {
  test.use({ storageState: "e2e/.auth/journalist.json" })

  let draftArticleId: string

  test.beforeAll(async () => {
    const journalistId = await getUserIdByEmail("farhan@newsportaljournalist.com")
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "DRAFT", { scenario: "a11y-edit", runId })
    draftArticleId = article.id
  })

  test.afterAll(async () => {
    await deleteArticleById(draftArticleId)
  })

  for (const path of ["/dashboard/articles", "/dashboard/articles/new"]) {
    test(`${path} has no critical/serious a11y violations`, async ({ page }) => {
      await page.goto(path)
      await assertNoBlockingViolations(page)
    })
  }

  test("/dashboard/articles/[id]/edit has no critical/serious a11y violations", async ({ page }) => {
    await page.goto(`/dashboard/articles/${draftArticleId}/edit`)
    await assertNoBlockingViolations(page)
  })
})

test.describe("Dashboard, editor/admin-only", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  let reviewArticleId: string

  test.beforeAll(async () => {
    const journalistId = await getUserIdByEmail("farhan@newsportaljournalist.com")
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "REVIEW", { scenario: "a11y-review", runId })
    reviewArticleId = article.id
  })

  test.afterAll(async () => {
    await deleteArticleById(reviewArticleId)
  })

  for (const path of ["/dashboard/review", "/dashboard/manage-articles", "/dashboard/analytics"]) {
    test(`${path} has no critical/serious a11y violations`, async ({ page }) => {
      await page.goto(path)
      await assertNoBlockingViolations(page)
    })
  }

  test("/dashboard/review/[id] has no critical/serious a11y violations", async ({ page }) => {
    await page.goto(`/dashboard/review/${reviewArticleId}`)
    await assertNoBlockingViolations(page)
  })
})

test.describe("Dashboard, admin-only", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  for (const path of ["/dashboard/users", "/dashboard/taxonomy"]) {
    test(`${path} has no critical/serious a11y violations`, async ({ page }) => {
      await page.goto(path)
      await assertNoBlockingViolations(page)
    })
  }
})

test.describe("Mobile navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test("Navbar mobile category drawer has no critical/serious a11y violations when open", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Buka menu kategori" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await assertNoBlockingViolations(page)
  })
})

test.describe("Mobile navigation (authenticated)", () => {
  test.use({ viewport: { width: 375, height: 812 }, storageState: "e2e/.auth/user.json" })

  test("DashboardNav mobile drawer has no critical/serious a11y violations when open", async ({ page }) => {
    await page.goto("/dashboard")
    await page.getByRole("button", { name: "Menu", exact: true }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await assertNoBlockingViolations(page)
  })
})

test.describe("Color contrast (report-only, does not fail) — public", () => {
  for (const path of ["/", "/article/revolusi-ai-mengubah-industri-media-2026", "/login"]) {
    test(`${path} contrast findings`, async ({ page }) => {
      await page.goto(path)
      await settle(page)
      const violations = await scanForViolations(page, { rules: "contrast" })
      await test.info().attach("contrast-findings", {
        body: formatViolations(violations),
        contentType: "text/plain",
      })
    })
  }
})

test.describe("Color contrast (report-only, does not fail) — dashboard admin", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  for (const path of ["/dashboard/users", "/dashboard/taxonomy"]) {
    test(`${path} contrast findings`, async ({ page }) => {
      await page.goto(path)
      await settle(page)
      const violations = await scanForViolations(page, { rules: "contrast" })
      await test.info().attach("contrast-findings", {
        body: formatViolations(violations),
        contentType: "text/plain",
      })
    })
  }
})
