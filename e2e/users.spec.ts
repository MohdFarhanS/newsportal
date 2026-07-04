import "dotenv/config"
import { test, expect, request } from "@playwright/test"
import {
  createThrowawayUser,
  createThrowawayUserFast,
  deleteThrowawayUser,
  getUserByEmail,
  setUserRoleDirect,
  setUserActiveDirect,
} from "./utils/db"
import { newRunId } from "./utils/ids"

const BASE_URL = "http://localhost:3000"
const ADMIN_EMAIL = "farhan@newsportaladmin.com"

test.describe("List & filter", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("filtering by role shows only matching rows", async ({ page }) => {
    await page.goto("/dashboard/users?role=ADMIN")
    const rows = page.locator(".divide-y > div")
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator("select")).toHaveValue("ADMIN")
    }
  })

  test("Reset link clears the role filter", async ({ page }) => {
    await page.goto("/dashboard/users?role=ADMIN")
    await page.getByRole("link", { name: "Reset" }).click()
    await expect(page).toHaveURL(/\/dashboard\/users$/)
    await expect(page.getByRole("combobox").first()).toHaveValue("")
  })
})

test.describe("Pagination", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("crossing into page 2 shows a disjoint set of rows", async ({ page }) => {
    const runId = newRunId()
    const seeded: { id: string; email: string }[] = []

    try {
      // 21 throwaway JOURNALIST rows + the 1 fixed real journalist test account = 22 total
      // under this filter, forcing a second page at perPage=20. Seeded sequentially so
      // createdAt ordering (desc) is deterministic: seeded[20] (last created) is newest,
      // seeded[0] is oldest among the throwaway batch.
      for (let i = 0; i < 21; i++) {
        const u = await createThrowawayUserFast({ scenario: `pagination-${i}`, runId, role: "JOURNALIST" })
        seeded.push(u)
      }

      await page.goto("/dashboard/users?role=JOURNALIST")
      await expect(page.getByRole("navigation", { name: "Halaman" })).toBeVisible()
      await expect(page.getByText(seeded[20].email)).toBeVisible()
      await expect(page.getByText(seeded[0].email)).not.toBeVisible()

      await page.goto("/dashboard/users?role=JOURNALIST&page=2")
      await expect(page.getByText(seeded[0].email)).toBeVisible()
      await expect(page.getByText(seeded[20].email)).not.toBeVisible()
    } finally {
      for (const u of seeded) await deleteThrowawayUser(u.id)
    }
  })
})

test.describe("Role change", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("admin changes another user's role", async ({ page }) => {
    const runId = newRunId()
    const target = await createThrowawayUserFast({ scenario: "role-change", runId, role: "USER" })

    try {
      await page.goto("/dashboard/users")
      const row = page.locator(".divide-y > div").filter({ hasText: target.email })
      await expect(row).toBeVisible()
      await expect(row.getByText("(Akun Anda)")).not.toBeVisible()

      page.once("dialog", (dialog) => dialog.accept())
      await row.locator("select").selectOption("EDITOR")

      await expect(page.getByText("Role diperbarui.")).toBeVisible()
      const updated = await getUserByEmail(target.email)
      expect(updated?.role).toBe("EDITOR")
    } finally {
      await deleteThrowawayUser(target.id)
    }
  })
})

test.describe("Self-guard", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  // Both tests below prove the UI safeguard (control disabled on admin's own row) AND, separately,
  // that the server independently rejects a self-targeting request. The server-side proof is done
  // by capturing a legitimate request against a THROWAWAY target (not self), swapping the body's
  // `userId` to admin's own id, and replaying it under admin's real session (page.request reuses
  // the page's own cookies). This is deliberately NOT done by stripping the `disabled` attribute
  // and dispatching a click on the real button: React's event system suppresses click-family
  // events for elements whose *React-tracked* `disabled` prop is true, checked independently of
  // the live DOM attribute — removing the DOM attribute doesn't fool it (confirmed by direct
  // testing: el.disabled read back false, a real bubbling MouseEvent dispatched, handler still
  // never ran). `change` events aren't part of that suppression list, which is incidental, not a
  // reliable technique to build on — hence the same capture-and-modify-replay approach for both.

  test("role: UI control is disabled, and the server independently rejects a self-targeting request", async ({
    page,
  }) => {
    const runId = newRunId()
    const target = await createThrowawayUserFast({ scenario: "self-guard-role", runId, role: "USER" })

    try {
      await page.goto("/dashboard/users")
      const selfRow = page.locator(".divide-y > div").filter({ hasText: ADMIN_EMAIL })
      await expect(selfRow).toBeVisible()
      await expect(selfRow.getByText("(Akun Anda)")).toBeVisible()
      await expect(selfRow.locator("select")).toBeDisabled()

      const targetRow = page.locator(".divide-y > div").filter({ hasText: target.email })
      await expect(targetRow).toBeVisible()

      const requestPromise = page.waitForRequest(
        (req) => req.method() === "POST" && req.url().includes("/dashboard/users")
      )
      page.once("dialog", (dialog) => dialog.accept())
      await targetRow.locator("select").selectOption("EDITOR")
      const capturedRequest = await requestPromise
      await expect(page.getByText("Role diperbarui.")).toBeVisible()

      const url = capturedRequest.url()
      const headers = { ...(await capturedRequest.allHeaders()) }
      delete headers["cookie"]
      delete headers["content-length"]
      const body = JSON.parse(capturedRequest.postData() ?? "[]")
      const admin = await getUserByEmail(ADMIN_EMAIL)
      body[0].userId = admin!.id
      const modifiedPostData = JSON.stringify(body)

      const res = await page.request.post(url, { headers, data: modifiedPostData })
      const bodyText = await res.text().catch(() => "")
      expect(bodyText).toContain("Tidak dapat mengubah role akun sendiri")

      const adminAfter = await getUserByEmail(ADMIN_EMAIL)
      expect(adminAfter?.role).toBe("ADMIN")
    } finally {
      await deleteThrowawayUser(target.id)
    }
  })

  test("suspend: UI control is disabled, and the server independently rejects a self-targeting request", async ({
    page,
  }) => {
    const runId = newRunId()
    const target = await createThrowawayUserFast({ scenario: "self-guard-suspend", runId, role: "USER" })

    try {
      await page.goto("/dashboard/users")
      const selfRow = page.locator(".divide-y > div").filter({ hasText: ADMIN_EMAIL })
      await expect(selfRow.getByRole("button", { name: "Nonaktifkan" })).toBeDisabled()

      const targetRow = page.locator(".divide-y > div").filter({ hasText: target.email })
      await expect(targetRow).toBeVisible()

      const requestPromise = page.waitForRequest(
        (req) => req.method() === "POST" && req.url().includes("/dashboard/users")
      )
      page.once("dialog", (dialog) => dialog.accept())
      await targetRow.getByRole("button", { name: "Nonaktifkan" }).click()
      const capturedRequest = await requestPromise
      await expect(page.getByText("Pengguna dinonaktifkan.")).toBeVisible()

      const url = capturedRequest.url()
      const headers = { ...(await capturedRequest.allHeaders()) }
      delete headers["cookie"]
      delete headers["content-length"]
      const body = JSON.parse(capturedRequest.postData() ?? "[]")
      const admin = await getUserByEmail(ADMIN_EMAIL)
      body[0].userId = admin!.id
      const modifiedPostData = JSON.stringify(body)

      const res = await page.request.post(url, { headers, data: modifiedPostData })
      const bodyText = await res.text().catch(() => "")
      expect(bodyText).toContain("Tidak dapat menonaktifkan akun sendiri")

      const adminAfter = await getUserByEmail(ADMIN_EMAIL)
      expect(adminAfter?.isActive).toBe(true)

      // Safety check: the admin's own session must still work after this attempt.
      await page.goto("/dashboard/users")
      await expect(page).toHaveURL(/\/dashboard\/users$/)
    } finally {
      await deleteThrowawayUser(target.id)
    }
  })
})

test.describe("Reactivation", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("reactivating a suspended user restores login access, with no confirm dialog", async ({ page, browser }) => {
    const runId = newRunId()
    const password = "ReactivateMe123"
    const { id: userId, email } = await createThrowawayUser({
      scenario: "reactivate",
      runId,
      password,
      isActive: false,
    })

    try {
      await page.goto("/dashboard/users")
      const row = page.locator(".divide-y > div").filter({ hasText: email })
      await expect(row.getByText("Nonaktif")).toBeVisible()

      // No dialog listener registered on purpose — per the confirmed asymmetry that only the
      // deactivate path calls window.confirm(), a stray real dialog here would hang this click
      // and fail the test, which is itself the regression guard.
      await row.getByRole("button", { name: "Aktifkan" }).click()
      await expect(row.getByText("Aktif")).toBeVisible()

      const loginContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const loginPage = await loginContext.newPage()
      await loginPage.goto("/login")
      await loginPage.locator("#email").fill(email)
      await loginPage.locator("#password").fill(password)
      await loginPage.getByRole("button", { name: "Masuk →" }).click()
      await loginPage.waitForURL("/")
      await expect(loginPage.getByText("Keluar")).toBeVisible()
      await loginContext.close()
    } finally {
      await deleteThrowawayUser(userId)
    }
  })
})

test.describe("Server Action RBAC — updateUserRoleAction / setUserActiveAction", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  // Scope note: only EDITOR/JOURNALIST are replayed here. USER and anonymous sessions never
  // reach the action at all — middleware's authorized() redirects them before this POST is
  // dispatched (same mechanism rbac.spec.ts already proves via GET), so replaying under those
  // two identities would just re-prove existing coverage via a different HTTP verb, not add new
  // signal. EDITOR/JOURNALIST pass middleware and are rejected by the action's own
  // requireAdmin() check — that's the genuinely new coverage this test adds.

  test("replaying a captured role-change request under EDITOR/JOURNALIST sessions has no effect", async ({
    page,
  }) => {
    const runId = newRunId()
    const probe = await createThrowawayUserFast({ scenario: "probe-role", runId, role: "USER" })

    try {
      await page.goto("/dashboard/users")
      const row = page.locator(".divide-y > div").filter({ hasText: probe.email })
      await expect(row).toBeVisible()

      const requestPromise = page.waitForRequest(
        (req) => req.method() === "POST" && req.url().includes("/dashboard/users")
      )
      page.once("dialog", (dialog) => dialog.accept())
      await row.locator("select").selectOption("EDITOR")
      const capturedRequest = await requestPromise

      await expect(page.getByText("Role diperbarui.")).toBeVisible()
      const afterLegit = await getUserByEmail(probe.email)
      expect(afterLegit?.role).toBe("EDITOR")

      // Reset to a baseline DIFFERENT from what the captured body would set, so a replay that
      // wrongly succeeds is observable (a replay that's correctly rejected leaves this alone).
      await setUserRoleDirect(probe.id, "USER")

      const url = capturedRequest.url()
      const headers = { ...(await capturedRequest.allHeaders()) }
      delete headers["cookie"]
      delete headers["content-length"]
      const postData = capturedRequest.postData() ?? ""

      for (const role of ["editor", "journalist"] as const) {
        const ctx = await request.newContext({ storageState: `e2e/.auth/${role}.json`, baseURL: BASE_URL })
        const res = await ctx.post(url, { headers, data: postData })
        const bodyText = await res.text().catch(() => "")
        expect(bodyText).toContain("Forbidden")
        await ctx.dispose()
      }

      const afterReplays = await getUserByEmail(probe.email)
      expect(afterReplays?.role).toBe("USER")
    } finally {
      await deleteThrowawayUser(probe.id)
    }
  })

  test("replaying a captured suspend request under EDITOR/JOURNALIST sessions has no effect", async ({ page }) => {
    const runId = newRunId()
    const probe = await createThrowawayUserFast({ scenario: "probe-suspend", runId, role: "USER" })

    try {
      await page.goto("/dashboard/users")
      const row = page.locator(".divide-y > div").filter({ hasText: probe.email })
      await expect(row).toBeVisible()

      const requestPromise = page.waitForRequest(
        (req) => req.method() === "POST" && req.url().includes("/dashboard/users")
      )
      page.once("dialog", (dialog) => dialog.accept())
      await row.getByRole("button", { name: "Nonaktifkan" }).click()
      const capturedRequest = await requestPromise

      await expect(page.getByText("Pengguna dinonaktifkan.")).toBeVisible()
      const afterLegit = await getUserByEmail(probe.email)
      expect(afterLegit?.isActive).toBe(false)

      await setUserActiveDirect(probe.id, true)

      const url = capturedRequest.url()
      const headers = { ...(await capturedRequest.allHeaders()) }
      delete headers["cookie"]
      delete headers["content-length"]
      const postData = capturedRequest.postData() ?? ""

      for (const role of ["editor", "journalist"] as const) {
        const ctx = await request.newContext({ storageState: `e2e/.auth/${role}.json`, baseURL: BASE_URL })
        const res = await ctx.post(url, { headers, data: postData })
        const bodyText = await res.text().catch(() => "")
        expect(bodyText).toContain("Forbidden")
        await ctx.dispose()
      }

      const afterReplays = await getUserByEmail(probe.email)
      expect(afterReplays?.isActive).toBe(true)
    } finally {
      await deleteThrowawayUser(probe.id)
    }
  })
})
