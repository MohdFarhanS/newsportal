import "dotenv/config"
import { test, expect, request, type Page } from "@playwright/test"
import slugify from "slugify"
import {
  createThrowawayCategory,
  deleteCategoryById,
  getCategoryIdBySlug,
  createThrowawayTag,
  deleteTagById,
  getTagIdBySlug,
  attachTagToArticle,
  getArticleTagIds,
  seedArticleAtStatus,
  deleteArticleById,
  getArticleRaw,
  getUserIdByEmail,
} from "./utils/db"
import { newRunId } from "./utils/ids"

const BASE_URL = "http://localhost:3000"

let journalistUserId: string

test.beforeAll(async () => {
  journalistUserId = await getUserIdByEmail("farhan@newsportaljournalist.com")
})

test.describe("Category Management", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("create with auto-derived slug from name", async ({ page }) => {
    const runId = newRunId()
    const name = `[E2E] cat-auto ${runId}`
    let categoryId = ""

    try {
      await page.goto("/dashboard/taxonomy")
      await page.getByRole("button", { name: "+ Tambah Kategori" }).click()

      const dialog = page.getByRole("dialog")
      await dialog.getByRole("textbox").nth(0).fill(name)
      const slugValue = await dialog.getByRole("textbox").nth(1).inputValue()
      expect(slugValue).toBe(slugify(name, { lower: true, strict: true }))

      await dialog.getByRole("button", { name: "Simpan" }).click()
      await expect(dialog).not.toBeVisible()
      await expect(page.getByText("Kategori ditambahkan.")).toBeVisible()

      const row = page.locator(".divide-y > div").filter({ hasText: name })
      await expect(row).toBeVisible()
      await expect(row.getByText(`/${slugValue}`)).toBeVisible()

      categoryId = (await getCategoryIdBySlug(slugValue)) ?? ""
      expect(categoryId).not.toBe("")
    } finally {
      if (categoryId) await deleteCategoryById(categoryId)
    }
  })

  test("create with a manually-edited slug override", async ({ page }) => {
    const runId = newRunId()
    const name = `[E2E] cat-manual ${runId}`
    const manualSlug = `e2e-manual-slug-${runId}`
    let categoryId = ""

    try {
      await page.goto("/dashboard/taxonomy")
      await page.getByRole("button", { name: "+ Tambah Kategori" }).click()

      const dialog = page.getByRole("dialog")
      await dialog.getByRole("textbox").nth(0).fill(name)
      await dialog.getByRole("textbox").nth(1).fill(manualSlug)
      await dialog.getByRole("button", { name: "Simpan" }).click()
      await expect(dialog).not.toBeVisible()

      const row = page.locator(".divide-y > div").filter({ hasText: name })
      await expect(row.getByText(`/${manualSlug}`)).toBeVisible()

      categoryId = (await getCategoryIdBySlug(manualSlug)) ?? ""
      expect(categoryId).not.toBe("")
    } finally {
      if (categoryId) await deleteCategoryById(categoryId)
    }
  })

  test("duplicate name is rejected", async ({ page }) => {
    const runId = newRunId()
    const existing = await createThrowawayCategory({ scenario: "cat-dupname", runId })

    try {
      await page.goto("/dashboard/taxonomy")
      await page.getByRole("button", { name: "+ Tambah Kategori" }).click()

      const dialog = page.getByRole("dialog")
      await dialog.getByRole("textbox").nth(0).fill(existing.name)
      await dialog.getByRole("textbox").nth(1).fill(`e2e-dupname-different-${runId}`)
      await dialog.getByRole("button", { name: "Simpan" }).click()

      await expect(page.getByText("Nama kategori sudah digunakan.")).toBeVisible()
      await expect(dialog).toBeVisible()
    } finally {
      await deleteCategoryById(existing.id)
    }
  })

  test("duplicate slug is rejected", async ({ page }) => {
    const runId = newRunId()
    const existing = await createThrowawayCategory({ scenario: "cat-dupslug", runId })

    try {
      await page.goto("/dashboard/taxonomy")
      await page.getByRole("button", { name: "+ Tambah Kategori" }).click()

      const dialog = page.getByRole("dialog")
      await dialog.getByRole("textbox").nth(0).fill(`[E2E] cat-dupslug-different ${runId}`)
      await dialog.getByRole("textbox").nth(1).fill(existing.slug)
      await dialog.getByRole("button", { name: "Simpan" }).click()

      await expect(page.getByText("Slug sudah digunakan.")).toBeVisible()
      await expect(dialog).toBeVisible()
    } finally {
      await deleteCategoryById(existing.id)
    }
  })

  test("FR-CMS-04 — delete is blocked while an article still references the category", async ({ page }) => {
    const runId = newRunId()
    const category = await createThrowawayCategory({ scenario: "cat-inuse", runId })
    const article = await seedArticleAtStatus(journalistUserId, "PUBLISHED", {
      scenario: "cat-inuse",
      runId,
      categoryId: category.id,
    })

    try {
      await page.goto("/dashboard/taxonomy")
      const row = page.locator(".divide-y > div").filter({ hasText: category.name })
      await expect(row.getByText("1 artikel")).toBeVisible()

      page.once("dialog", (dialog) => dialog.accept())
      await row.getByRole("button", { name: "Hapus" }).click()

      await expect(
        page.getByText("Kategori masih memiliki 1 artikel. Pindahkan artikel terlebih dahulu.")
      ).toBeVisible()
      await expect(row).toBeVisible()

      const dbArticle = await getArticleRaw(article.id)
      expect(dbArticle?.categoryId).toBe(category.id)
    } finally {
      await deleteArticleById(article.id)
      await deleteCategoryById(category.id)
    }
  })

  test("deleting an unused category succeeds", async ({ page }) => {
    const runId = newRunId()
    const category = await createThrowawayCategory({ scenario: "cat-unused", runId })

    try {
      await page.goto("/dashboard/taxonomy")
      const row = page.locator(".divide-y > div").filter({ hasText: category.name })
      await expect(row).toBeVisible()

      page.once("dialog", (dialog) => dialog.accept())
      await row.getByRole("button", { name: "Hapus" }).click()

      await expect(page.getByText("Kategori dihapus.")).toBeVisible()
      await expect(row).not.toBeVisible()
    } finally {
      await deleteCategoryById(category.id)
    }
  })

  test("editing a category's name is reflected on its public page", async ({ page }) => {
    const runId = newRunId()
    const category = await createThrowawayCategory({ scenario: "cat-edit", runId })
    const updatedName = `${category.name} updated`

    try {
      await page.goto("/dashboard/taxonomy")
      const row = page.locator(".divide-y > div").filter({ hasText: category.name })
      await row.getByRole("button", { name: "Edit" }).click()

      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Edit Kategori")).toBeVisible()
      await dialog.getByRole("textbox").nth(0).fill(updatedName)
      await dialog.getByRole("button", { name: "Simpan" }).click()
      await expect(dialog).not.toBeVisible()
      await expect(page.getByText("Kategori diperbarui.")).toBeVisible()

      await page.goto(`/category/${category.slug}`)
      await expect(page.getByText(updatedName)).toBeVisible()
    } finally {
      await deleteCategoryById(category.id)
    }
  })
})

test.describe("Tag Management", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  async function openTagTab(page: Page) {
    await page.goto("/dashboard/taxonomy")
    await page.getByRole("button", { name: /^Tag \(/ }).click()
  }

  test("create with auto-derived slug from name", async ({ page }) => {
    const runId = newRunId()
    // Tag.name has a 30-char max (categorySchema allows 50, tagSchema only 30) — keep short.
    const name = `[E2E]tag-auto${runId.slice(-8)}`
    let tagId = ""

    try {
      await openTagTab(page)
      await page.getByRole("button", { name: "+ Tambah Tag" }).click()

      const dialog = page.getByRole("dialog")
      await dialog.getByRole("textbox").nth(0).fill(name)
      const slugValue = await dialog.getByRole("textbox").nth(1).inputValue()
      expect(slugValue).toBe(slugify(name, { lower: true, strict: true }))

      await dialog.getByRole("button", { name: "Simpan" }).click()
      await expect(dialog).not.toBeVisible()
      await expect(page.getByText("Tag ditambahkan.")).toBeVisible()

      await page.getByRole("button", { name: /^Tag \(/ }).click()
      const row = page.locator(".divide-y > div").filter({ hasText: name })
      await expect(row).toBeVisible()

      tagId = (await getTagIdBySlug(slugValue)) ?? ""
      expect(tagId).not.toBe("")
    } finally {
      if (tagId) await deleteTagById(tagId)
    }
  })

  test("duplicate name and duplicate slug are both rejected", async ({ page }) => {
    const runId = newRunId()
    const shortId = runId.slice(-8)
    // Tag.name has a 30-char max — all names/slugs here are kept deliberately short.
    const existing = await createThrowawayTag({ scenario: "tag-dup", runId, name: `[E2E]tag-dup${shortId}` })

    try {
      await openTagTab(page)
      await page.getByRole("button", { name: "+ Tambah Tag" }).click()

      const dialog = page.getByRole("dialog")
      await dialog.getByRole("textbox").nth(0).fill(existing.name)
      await dialog.getByRole("textbox").nth(1).fill(`e2e-tag-dup-b-${shortId}`)
      await dialog.getByRole("button", { name: "Simpan" }).click()
      await expect(page.getByText("Nama tag sudah digunakan.")).toBeVisible()

      await dialog.getByRole("textbox").nth(0).fill(`[E2E]tag-dup-b${shortId}`)
      await dialog.getByRole("textbox").nth(1).fill(existing.slug)
      await dialog.getByRole("button", { name: "Simpan" }).click()
      await expect(page.getByText("Slug sudah digunakan.")).toBeVisible()
    } finally {
      await deleteTagById(existing.id)
    }
  })

  test("FR-CMS-05 (critical) — delete is blocked while a published article still uses the tag, and the tag is not silently detached", async ({
    page,
  }) => {
    const runId = newRunId()
    const tag = await createThrowawayTag({ scenario: "tag-inuse", runId })
    const article = await seedArticleAtStatus(journalistUserId, "PUBLISHED", { scenario: "tag-inuse", runId })
    await attachTagToArticle(article.id, tag.id)

    try {
      await openTagTab(page)
      const row = page.locator(".divide-y > div").filter({ hasText: tag.name })
      await expect(row.getByText("1 artikel")).toBeVisible()

      page.once("dialog", (dialog) => dialog.accept())
      await row.getByRole("button", { name: "Hapus" }).click()

      await expect(page.getByText("Tag masih dipakai 1 artikel.")).toBeVisible()
      await expect(row).toBeVisible()

      // DB-level proof: the join row was not cascade-removed by the blocked delete attempt.
      const remainingTagIds = await getArticleTagIds(article.id)
      expect(remainingTagIds).toContain(tag.id)

      // User-facing proof: the tag is still rendered on the live public article page.
      await page.goto(`/article/${article.slug}`)
      await expect(page.getByText(`#${tag.name}`)).toBeVisible()
    } finally {
      await deleteArticleById(article.id)
      await deleteTagById(tag.id)
    }
  })

  test("deleting an unused tag succeeds", async ({ page }) => {
    const runId = newRunId()
    const tag = await createThrowawayTag({ scenario: "tag-unused", runId })

    try {
      await openTagTab(page)
      const row = page.locator(".divide-y > div").filter({ hasText: tag.name })
      await expect(row).toBeVisible()

      page.once("dialog", (dialog) => dialog.accept())
      await row.getByRole("button", { name: "Hapus" }).click()

      await expect(page.getByText("Tag dihapus.")).toBeVisible()
      await expect(row).not.toBeVisible()
    } finally {
      await deleteTagById(tag.id)
    }
  })
})

test.describe("RBAC — Categories & Tags REST API", () => {
  test("GET /api/categories and /api/tags are public, no auth required", async () => {
    const anon = await request.newContext({ baseURL: BASE_URL })
    try {
      expect((await anon.get("/api/categories")).status()).toBe(200)
      expect((await anon.get("/api/tags")).status()).toBe(200)
    } finally {
      await anon.dispose()
    }
  })

  test("anonymous cannot mutate categories or tags (401)", async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL })
    try {
      const catRes = await ctx.post("/api/categories", { data: { name: "x", slug: "x" } })
      expect(catRes.status()).toBe(401)
      const tagRes = await ctx.post("/api/tags", { data: { name: "x", slug: "x" } })
      expect(tagRes.status()).toBe(401)
    } finally {
      await ctx.dispose()
    }
  })

  for (const role of ["editor", "journalist", "user"] as const) {
    test(`${role} cannot mutate categories or tags (403)`, async () => {
      const ctx = await request.newContext({ storageState: `e2e/.auth/${role}.json`, baseURL: BASE_URL })
      try {
        const catRes = await ctx.post("/api/categories", { data: { name: "x", slug: "x" } })
        expect(catRes.status()).toBe(403)
        const tagRes = await ctx.post("/api/tags", { data: { name: "x", slug: "x" } })
        expect(tagRes.status()).toBe(403)
      } finally {
        await ctx.dispose()
      }
    })
  }

  test("admin: full create -> patch -> delete lifecycle succeeds for both categories and tags", async () => {
    const runId = newRunId()
    const ctx = await request.newContext({ storageState: "e2e/.auth/admin.json", baseURL: BASE_URL })
    let categoryId = ""
    let tagId = ""

    try {
      const catName = `[E2E] rbac-lifecycle-cat ${runId}`
      const catSlug = `e2e-rbac-lifecycle-cat-${runId}`
      const createCatRes = await ctx.post("/api/categories", { data: { name: catName, slug: catSlug } })
      expect(createCatRes.status()).toBe(201)
      categoryId = (await createCatRes.json()).category.id

      const patchCatRes = await ctx.patch(`/api/categories/${categoryId}`, {
        data: { name: `${catName} v2`, slug: catSlug },
      })
      expect(patchCatRes.status()).toBe(200)

      const deleteCatRes = await ctx.delete(`/api/categories/${categoryId}`)
      expect(deleteCatRes.status()).toBe(200)
      categoryId = ""

      // Tag.name/slug max out at 30/40 chars (unlike Category's 50/60) — keep both short,
      // including the " v2" patch suffix on the name.
      const tagName = `[E2E]rbac-tag${runId.slice(-8)}`
      const tagSlug = `e2e-rbac-tag-${runId.slice(-8)}`
      const createTagRes = await ctx.post("/api/tags", { data: { name: tagName, slug: tagSlug } })
      expect(createTagRes.status()).toBe(201)
      tagId = (await createTagRes.json()).tag.id

      const patchTagRes = await ctx.patch(`/api/tags/${tagId}`, { data: { name: `${tagName} v2`, slug: tagSlug } })
      expect(patchTagRes.status()).toBe(200)

      const deleteTagRes = await ctx.delete(`/api/tags/${tagId}`)
      expect(deleteTagRes.status()).toBe(200)
      tagId = ""
    } finally {
      if (categoryId) await deleteCategoryById(categoryId)
      if (tagId) await deleteTagById(tagId)
      await ctx.dispose()
    }
  })
})
