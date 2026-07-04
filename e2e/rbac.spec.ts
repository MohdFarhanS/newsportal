import { test, expect } from "@playwright/test"
import { createThrowawayUser, deleteThrowawayUser, seedArticleAtStatus } from "./utils/db"
import { newRunId } from "./utils/ids"

test.describe("Visitor (no session)", () => {
  test("hitting any /dashboard route redirects to /login with callbackUrl", async ({ page }) => {
    await page.goto("/dashboard/articles")
    await page.waitForURL(/\/login\?callbackUrl=/)
    expect(new URL(page.url()).searchParams.get("callbackUrl")).toContain("/dashboard/articles")
  })
})

test.describe("USER role", () => {
  test.use({ storageState: "e2e/.auth/user.json" })

  for (const path of ["/dashboard", "/dashboard/profile", "/dashboard/security", "/dashboard/bookmarks", "/dashboard/history"]) {
    test(`allowed route ${path} loads normally`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "$"))
    })
  }

  for (const path of ["/dashboard/articles", "/dashboard/review", "/dashboard/users", "/dashboard/manage-articles"]) {
    test(`disallowed route ${path} redirects to / (middleware-level, not /dashboard)`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL("/")
    })
  }
})

test.describe("JOURNALIST role", () => {
  test.use({ storageState: "e2e/.auth/journalist.json" })

  for (const path of ["/dashboard/articles", "/dashboard/articles/new"]) {
    test(`content route ${path} loads normally`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "$"))
    })
  }

  for (const path of ["/dashboard/review", "/dashboard/manage-articles", "/dashboard/analytics", "/dashboard/users", "/dashboard/taxonomy"]) {
    test(`editor/admin-only route ${path} redirects to /dashboard (page-level guard)`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL(/\/dashboard$/)
    })
  }
})

test.describe("EDITOR role", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  for (const path of ["/dashboard/review", "/dashboard/manage-articles", "/dashboard/analytics"]) {
    test(`editor route ${path} loads normally`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "$"))
    })
  }

  for (const path of ["/dashboard/users", "/dashboard/taxonomy"]) {
    test(`admin-only route ${path} redirects to /dashboard`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL(/\/dashboard$/)
    })
  }
})

test.describe("ADMIN role", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  for (const path of [
    "/dashboard/users",
    "/dashboard/taxonomy",
    "/dashboard/review",
    "/dashboard/manage-articles",
    "/dashboard/articles",
    "/dashboard/analytics",
  ]) {
    test(`full access — ${path} loads without redirect`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/") + "$"))
    })
  }
})

test.describe("Ownership — /dashboard/articles/[id]/edit", () => {
  test("a different journalist's draft 404s for JOURNALIST, EDITOR, and ADMIN", async ({ browser }) => {
    const runId = newRunId()
    const { id: ownerId } = await createThrowawayUser({ scenario: "owner", runId, role: "JOURNALIST" })

    try {
      const article = await seedArticleAtStatus(ownerId, "DRAFT", { scenario: "ownership", runId })

      for (const role of ["journalist", "editor", "admin"] as const) {
        const context = await browser.newContext({ storageState: `e2e/.auth/${role}.json` })
        const page = await context.newPage()
        await page.goto(`/dashboard/articles/${article.id}/edit`)
        // `next dev` reports HTTP 200 for a rendered notFound() page (confirmed correct 404 in
        // production builds) — assert on the rendered not-found content instead of raw status.
        await expect(page.getByRole("heading", { name: "Halaman Tidak Ditemukan" })).toBeVisible()
        await context.close()
      }
    } finally {
      await deleteThrowawayUser(ownerId)
    }
  })
})
