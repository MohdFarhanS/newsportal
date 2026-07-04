import "dotenv/config"
// Reuses existing storageState files only — never add a manual page.goto("/login") + form
// submit here, or it eats into the login rate limiter's budget documented in CLAUDE.md.
import { test, expect, type Page } from "@playwright/test"
import {
  BREAKPOINTS,
  MD_BOUNDARY_BELOW,
  MD_BOUNDARY_AT,
  LG_BOUNDARY_BELOW,
  LG_BOUNDARY_AT,
  hasHorizontalOverflow,
} from "./utils/responsive"
import {
  getUserIdByEmail,
  createResetToken,
  createThrowawayUser,
  createThrowawayUserFast,
  deleteThrowawayUser,
  seedArticleAtStatus,
  deleteArticleById,
  snapshotFeaturedState,
  restoreFeaturedState,
  setFeatured,
} from "./utils/db"
import { newRunId } from "./utils/ids"

async function assertNoOverflowAcrossBreakpoints(page: Page, path: string) {
  for (const [name, size] of Object.entries(BREAKPOINTS)) {
    await page.setViewportSize(size)
    await page.goto(path)
    await page.waitForLoadState("networkidle")
    const overflow = await hasHorizontalOverflow(page)
    expect(overflow, `${path} overflows horizontally at ${name} (${size.width}px)`).toBe(false)
  }
}

// Fixture state shared across the overflow sweep describe blocks below — seeded once at file
// scope (not per describe) since these are read-mostly checks, matching accessibility.spec.ts's
// convention of seeding once per section rather than per test.
let resetUserId: string
let resetToken: string
let authorId: string
let journalistId: string
let draftArticleId: string
let reviewArticleId: string

test.beforeAll(async () => {
  const runId = newRunId()
  const resetUser = await createThrowawayUser({ scenario: "resp-reset", runId })
  resetUserId = resetUser.id
  resetToken = await createResetToken(resetUserId)

  authorId = await getUserIdByEmail("journalist@newsportal.com")
  journalistId = await getUserIdByEmail("farhan@newsportaljournalist.com")

  const draft = await seedArticleAtStatus(journalistId, "DRAFT", { scenario: "resp-edit", runId })
  draftArticleId = draft.id

  const review = await seedArticleAtStatus(journalistId, "REVIEW", { scenario: "resp-review", runId })
  reviewArticleId = review.id
})

test.afterAll(async () => {
  await deleteThrowawayUser(resetUserId)
  await deleteArticleById(draftArticleId)
  await deleteArticleById(reviewArticleId)
})

test.describe("Overflow sweep — public pages", () => {
  for (const path of ["/", "/latest", "/about", "/contact", "/search", "/login", "/register", "/forgot-password"]) {
    test(`${path} has no horizontal overflow at any breakpoint`, async ({ page }) => {
      await assertNoOverflowAcrossBreakpoints(page, path)
    })
  }
})

test.describe("Overflow sweep — dynamic public pages", () => {
  test("/reset-password/[token] has no horizontal overflow at any breakpoint", async ({ page }) => {
    await assertNoOverflowAcrossBreakpoints(page, `/reset-password/${resetToken}`)
  })

  test("/article/[slug] has no horizontal overflow at any breakpoint", async ({ page }) => {
    await assertNoOverflowAcrossBreakpoints(page, "/article/revolusi-ai-mengubah-industri-media-2026")
  })

  for (const slug of ["teknologi", "bisnis", "olahraga", "hiburan", "kesehatan", "politik"]) {
    test(`/category/${slug} has no horizontal overflow at any breakpoint`, async ({ page }) => {
      await assertNoOverflowAcrossBreakpoints(page, `/category/${slug}`)
    })
  }

  test("/author/[id] has no horizontal overflow at any breakpoint", async ({ page }) => {
    await assertNoOverflowAcrossBreakpoints(page, `/author/${authorId}`)
  })
})

test.describe("Overflow sweep — dashboard, any authenticated role", () => {
  test.use({ storageState: "e2e/.auth/user.json" })

  for (const path of ["/dashboard", "/dashboard/profile", "/dashboard/security", "/dashboard/bookmarks", "/dashboard/history"]) {
    test(`${path} has no horizontal overflow at any breakpoint`, async ({ page }) => {
      await assertNoOverflowAcrossBreakpoints(page, path)
    })
  }
})

test.describe("Overflow sweep — dashboard, content roles", () => {
  test.use({ storageState: "e2e/.auth/journalist.json" })

  for (const path of ["/dashboard/articles", "/dashboard/articles/new"]) {
    test(`${path} has no horizontal overflow at any breakpoint`, async ({ page }) => {
      await assertNoOverflowAcrossBreakpoints(page, path)
    })
  }

  test("/dashboard/articles/[id]/edit has no horizontal overflow at any breakpoint", async ({ page }) => {
    await assertNoOverflowAcrossBreakpoints(page, `/dashboard/articles/${draftArticleId}/edit`)
  })
})

test.describe("Overflow sweep — dashboard, editor/admin-only", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  for (const path of ["/dashboard/review", "/dashboard/manage-articles", "/dashboard/analytics"]) {
    test(`${path} has no horizontal overflow at any breakpoint`, async ({ page }) => {
      await assertNoOverflowAcrossBreakpoints(page, path)
    })
  }

  test("/dashboard/review/[id] has no horizontal overflow at any breakpoint", async ({ page }) => {
    await assertNoOverflowAcrossBreakpoints(page, `/dashboard/review/${reviewArticleId}`)
  })
})

test.describe("Overflow sweep — dashboard, admin-only", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  for (const path of ["/dashboard/users", "/dashboard/taxonomy"]) {
    test(`${path} has no horizontal overflow at any breakpoint`, async ({ page }) => {
      await assertNoOverflowAcrossBreakpoints(page, path)
    })
  }
})

// The one genuine historical bug: dashboard/users' row list used a fixed grid with no
// breakpoint, collapsing the name+email column to near-zero width at 375px (three `auto`
// columns grabbed space first) — name/email became completely invisible, plus overflow.
// Fixed with flex-col (mobile/tablet) -> lg:grid (1024px+, deliberately not md/768 — that
// was tried and rejected as still too tight given the 192px sidebar).
test.describe("Regression: dashboard/users grid→flex breakpoint", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  let targetId: string
  let targetEmail: string

  test.beforeAll(async () => {
    const runId = newRunId()
    const target = await createThrowawayUserFast({ scenario: "resp-users-regress", runId, role: "USER" })
    targetId = target.id
    targetEmail = target.email
  })

  test.afterAll(async () => {
    await deleteThrowawayUser(targetId)
  })

  for (const [name, size] of [
    ["mobile (375px)", BREAKPOINTS.mobile],
    ["tablet (768px)", BREAKPOINTS.tablet],
  ] as const) {
    test(`name+email column is not collapsed at ${name}`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto("/dashboard/users")
      const row = page.locator(".divide-y > div").filter({ hasText: targetEmail })
      await expect(row).toBeVisible()

      const nameEl = row.locator("p.truncate").first()
      await expect(nameEl).toBeVisible()
      const box = await nameEl.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width, `name column width was only ${box?.width}px at ${size.width}px viewport`).toBeGreaterThan(
        size.width * 0.5
      )

      expect(await hasHorizontalOverflow(page)).toBe(false)
      // "Bergabung" is the column-header row's unique text (unlike "Pengguna", which also
      // appears as the page's <h1> heading) — the header row is hidden entirely below 1024px.
      await expect(page.getByText("Bergabung")).not.toBeVisible()
    })
  }

  test("header row hidden at 1023px, visible at 1024px (lg boundary)", async ({ page }) => {
    await page.setViewportSize(LG_BOUNDARY_BELOW)
    await page.goto("/dashboard/users")
    await expect(page.getByText("Bergabung")).not.toBeVisible()

    await page.setViewportSize(LG_BOUNDARY_AT)
    await expect(page.getByText("Bergabung")).toBeVisible()
  })
})

test.describe("Nav toggle: Navbar category nav (md breakpoint)", () => {
  for (const size of [BREAKPOINTS.mobile, MD_BOUNDARY_BELOW]) {
    test(`mobile trigger visible, desktop nav hidden at ${size.width}px`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto("/")
      await expect(page.getByRole("button", { name: "Buka menu kategori" })).toBeVisible()
      await expect(page.getByRole("navigation", { name: "Kategori", exact: true })).not.toBeVisible()
    })
  }

  for (const size of [MD_BOUNDARY_AT, BREAKPOINTS.desktop]) {
    test(`desktop nav visible, mobile trigger hidden at ${size.width}px`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto("/")
      await expect(page.getByRole("navigation", { name: "Kategori", exact: true })).toBeVisible()
      await expect(page.getByRole("button", { name: "Buka menu kategori" })).not.toBeVisible()
    })
  }
})

test.describe("Nav toggle: DashboardNav sidebar (md breakpoint)", () => {
  test.use({ storageState: "e2e/.auth/user.json" })

  for (const size of [BREAKPOINTS.mobile, MD_BOUNDARY_BELOW]) {
    test(`mobile trigger visible, desktop sidebar hidden at ${size.width}px`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto("/dashboard")
      await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeVisible()
      await expect(page.getByRole("navigation", { name: "Dashboard" })).not.toBeVisible()
    })
  }

  for (const size of [MD_BOUNDARY_AT, BREAKPOINTS.desktop]) {
    test(`desktop sidebar visible, mobile trigger hidden at ${size.width}px`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto("/dashboard")
      await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Menu", exact: true })).not.toBeVisible()
    })
  }
})

test.describe("Nav toggle: FilterPanel (md breakpoint)", () => {
  for (const size of [BREAKPOINTS.mobile, MD_BOUNDARY_BELOW]) {
    test(`mobile trigger visible, desktop filter hidden at ${size.width}px`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto("/search")
      await expect(page.getByRole("button", { name: "Filter" })).toBeVisible()
      await expect(page.getByText("Rentang Waktu")).not.toBeVisible()
    })
  }

  for (const size of [MD_BOUNDARY_AT, BREAKPOINTS.desktop]) {
    test(`desktop filter visible, mobile trigger hidden at ${size.width}px`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto("/search")
      await expect(page.getByText("Rentang Waktu")).toBeVisible()
      await expect(page.getByRole("button", { name: "Filter" })).not.toBeVisible()
    })
  }
})

test.describe("Column-hide: dashboard/analytics (Kategori@sm, Penulis@md)", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  test("both columns hidden at mobile, both visible at desktop", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.mobile)
    await page.goto("/dashboard/analytics")
    await expect(page.getByRole("columnheader", { name: "Kategori" })).not.toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Penulis" })).not.toBeVisible()

    await page.setViewportSize(BREAKPOINTS.desktop)
    await expect(page.getByRole("columnheader", { name: "Kategori" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Penulis" })).toBeVisible()
  })
})

test.describe("Column-hide: dashboard/review (Penulis@sm, Kategori@md)", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  test("both columns hidden at mobile, both visible at desktop", async ({ page }) => {
    await page.setViewportSize(BREAKPOINTS.mobile)
    await page.goto("/dashboard/review")
    await expect(page.getByText("Penulis", { exact: true })).not.toBeVisible()
    await expect(page.getByText("Kategori", { exact: true })).not.toBeVisible()

    await page.setViewportSize(BREAKPOINTS.desktop)
    await expect(page.getByText("Penulis", { exact: true })).toBeVisible()
    await expect(page.getByText("Kategori", { exact: true })).toBeVisible()
  })
})

test.describe("Reflow: FeaturedSection (md breakpoint)", () => {
  let originalFeaturedIds: string[]
  const seeded: string[] = []

  test.beforeAll(async () => {
    originalFeaturedIds = await snapshotFeaturedState()
    const runId = newRunId()
    for (let i = 0; i < 2; i++) {
      const a = await seedArticleAtStatus(journalistId, "PUBLISHED", {
        scenario: `resp-featured-${i}`,
        runId,
        publishedAt: new Date(Date.now() - i * 60_000),
      })
      seeded.push(a.id)
    }
    await setFeatured(seeded)
  })

  test.afterAll(async () => {
    await restoreFeaturedState(originalFeaturedIds, seeded)
    for (const id of seeded) await deleteArticleById(id)
  })

  test("hero and secondary stack vertically below md, sit side-by-side at md+", async ({ page }) => {
    const section = page.locator('section[aria-label="Berita Utama"]')

    await page.setViewportSize(BREAKPOINTS.mobile)
    await page.goto("/")
    await expect(section.getByRole("heading", { name: "Berita Utama" })).toBeVisible()
    const gridMobile = section.locator("> div.grid > div")
    const heroMobile = await gridMobile.nth(0).boundingBox()
    const secondaryMobile = await gridMobile.nth(1).boundingBox()
    expect(heroMobile).not.toBeNull()
    expect(secondaryMobile).not.toBeNull()
    expect(secondaryMobile!.y, "expected secondary section below hero (stacked) at mobile").toBeGreaterThanOrEqual(
      heroMobile!.y + heroMobile!.height - 5
    )

    await page.setViewportSize(BREAKPOINTS.tablet)
    await page.goto("/")
    await expect(section.getByRole("heading", { name: "Berita Utama" })).toBeVisible()
    const gridTablet = section.locator("> div.grid > div")
    const heroTablet = await gridTablet.nth(0).boundingBox()
    const secondaryTablet = await gridTablet.nth(1).boundingBox()
    expect(heroTablet).not.toBeNull()
    expect(secondaryTablet).not.toBeNull()
    expect(secondaryTablet!.x, "expected secondary section beside hero (side-by-side) at tablet/md").toBeGreaterThan(
      heroTablet!.x + 20
    )
  })
})

test.describe("Reflow: homepage Latest + Trending (lg breakpoint)", () => {
  test("stack vertically below lg, sit side-by-side at lg+", async ({ page }) => {
    const latest = page.locator('section[aria-label="Berita Terbaru"]')
    const trending = page.locator('aside[aria-label="Trending"]')

    await page.setViewportSize(BREAKPOINTS.tablet)
    await page.goto("/")
    await expect(latest).toBeVisible()
    await expect(trending).toBeVisible()
    const latestBoxTablet = await latest.boundingBox()
    const trendingBoxTablet = await trending.boundingBox()
    expect(latestBoxTablet).not.toBeNull()
    expect(trendingBoxTablet).not.toBeNull()
    expect(trendingBoxTablet!.y, "expected Trending below Latest (stacked) below lg").toBeGreaterThanOrEqual(
      latestBoxTablet!.y + latestBoxTablet!.height - 5
    )

    await page.setViewportSize(BREAKPOINTS.desktop)
    await page.goto("/")
    await expect(latest).toBeVisible()
    await expect(trending).toBeVisible()
    const latestBoxDesktop = await latest.boundingBox()
    const trendingBoxDesktop = await trending.boundingBox()
    expect(latestBoxDesktop).not.toBeNull()
    expect(trendingBoxDesktop).not.toBeNull()
    expect(trendingBoxDesktop!.x, "expected Trending beside Latest (side-by-side) at lg+").toBeGreaterThan(
      latestBoxDesktop!.x + 20
    )
  })
})

test.describe("Reflow: Pagination text labels (sm breakpoint)", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("prev/next text hidden below sm, visible at sm+", async ({ page }) => {
    const runId = newRunId()
    const seeded: { id: string }[] = []

    try {
      for (let i = 0; i < 21; i++) {
        const u = await createThrowawayUserFast({ scenario: `resp-pagination-${i}`, runId, role: "JOURNALIST" })
        seeded.push(u)
      }

      await page.setViewportSize(BREAKPOINTS.mobile)
      await page.goto("/dashboard/users?role=JOURNALIST")
      await expect(page.getByRole("navigation", { name: "Halaman" })).toBeVisible()
      await expect(page.getByText("Berikutnya", { exact: true })).not.toBeVisible()

      await page.setViewportSize(BREAKPOINTS.desktop)
      await expect(page.getByText("Berikutnya", { exact: true })).toBeVisible()
    } finally {
      for (const u of seeded) await deleteThrowawayUser(u.id)
    }
  })
})
