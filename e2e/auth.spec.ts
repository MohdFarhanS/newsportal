import { test, expect } from "@playwright/test"
import {
  createThrowawayUser,
  deleteThrowawayUser,
  createResetToken,
  getUserByEmail,
  countUsersByEmail,
  getUserPasswordChangedAt,
} from "./utils/db"
import { newRunId } from "./utils/ids"

// NOTE: getRateLimiter() (register/forgot-password/reset-password) is a live Upstash limiter,
// 5 requests / 15 min per IP. This file hits it ~4 times in one clean run (register success,
// register duplicate, reset flow, expired-token reset) — avoid rerunning this file back-to-back
// within 15 minutes, and avoid manually testing login/register in a browser at the same time.

test.describe("Register", () => {
  test("success — throwaway account can register and lands on the homepage logged in", async ({ page }) => {
    const runId = newRunId()
    const email = `e2e-register-${runId}@test.newsportal.local`
    await page.goto("/register")
    await page.locator("#name").fill("E2E Register Test")
    await page.locator("#email").fill(email)
    await page.locator("#password").fill("Password123")
    await page.getByRole("button", { name: "Daftar →" }).click()
    await page.waitForURL("/")
    await expect(page.getByText("Keluar")).toBeVisible()

    const user = await getUserByEmail(email)
    expect(user?.role).toBe("USER")
    if (user) await deleteThrowawayUser(user.id)
  })

  test("client-side validation — short name, invalid email, weak password", async ({ page }) => {
    await page.goto("/register")
    await page.locator("#name").fill("A")
    await page.locator("#email").fill("not-an-email")
    await page.locator("#password").fill("short")
    await page.getByRole("button", { name: "Daftar →" }).click()

    await expect(page.getByText("Nama minimal 2 karakter")).toBeVisible()
    await expect(page.getByText("Email tidak valid")).toBeVisible()
    await expect(page.getByText("Password minimal 8 karakter")).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
  })

  test("weak password — missing digit / missing letter rejected", async ({ page }) => {
    const runId = newRunId()
    await page.goto("/register")
    await page.locator("#name").fill("E2E Weak Password")
    await page.locator("#email").fill(`e2e-weakpw-${runId}@test.newsportal.local`)
    await page.locator("#password").fill("onlyletters")
    await page.getByRole("button", { name: "Daftar →" }).click()
    await expect(page.getByText("Password harus mengandung angka")).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
  })

  test("duplicate email — 409 shows server error, no duplicate row created", async ({ page }) => {
    const runId = newRunId()
    const { id: existingId, email } = await createThrowawayUser({ scenario: "dup", runId })

    await page.goto("/register")
    await page.locator("#name").fill("E2E Duplicate")
    await page.locator("#email").fill(email)
    await page.locator("#password").fill("Password123")
    await page.getByRole("button", { name: "Daftar →" }).click()

    await expect(page.getByText("Email sudah terdaftar.")).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)

    const count = await countUsersByEmail(email)
    expect(count).toBe(1)
    await deleteThrowawayUser(existingId)
  })
})

test.describe("Login", () => {
  const ACCOUNTS = {
    ADMIN: { email: "farhan@newsportaladmin.com", password: "password1121" },
    EDITOR: { email: "farhan@newsportaleditor.com", password: "password1121" },
    JOURNALIST: { email: "farhan@newsportaljournalist.com", password: "password1121" },
    USER: { email: "farhan@newsportaluser.com", password: "password1121" },
  } as const

  for (const [role, creds] of Object.entries(ACCOUNTS)) {
    test(`success — ${role} logs in and lands on the homepage`, async ({ page }) => {
      await page.goto("/login")
      await page.locator("#email").fill(creds.email)
      await page.locator("#password").fill(creds.password)
      await page.getByRole("button", { name: "Masuk →" }).click()
      await page.waitForURL("/")
      await expect(page.getByText("Keluar")).toBeVisible()
    })
  }

  test("failure — wrong password shows generic error", async ({ page }) => {
    await page.goto("/login")
    await page.locator("#email").fill("farhan@newsportaluser.com")
    await page.locator("#password").fill("wrong-password-xyz")
    await page.getByRole("button", { name: "Masuk →" }).click()
    await expect(page.getByText("Email atau kata sandi salah.")).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test("failure — unknown email shows the same generic error (no enumeration)", async ({ page }) => {
    const runId = newRunId()
    await page.goto("/login")
    await page.locator("#email").fill(`e2e-nonexistent-${runId}@test.newsportal.local`)
    await page.locator("#password").fill("whatever123")
    await page.getByRole("button", { name: "Masuk →" }).click()
    await expect(page.getByText("Email atau kata sandi salah.")).toBeVisible()
  })
})

test.describe("Logout", () => {
  test.use({ storageState: "e2e/.auth/editor.json" })

  test("logout invalidates the session — cookie is actually cleared", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole("button", { name: "Keluar" }).click()
    await page.getByRole("button", { name: "Ya, keluar" }).click()
    await page.waitForURL("/")

    await page.goto("/dashboard")
    await page.waitForURL(/\/login/)
  })
})

test.describe("FR-AUTH-05 — password reset invalidates other sessions", () => {
  test("two-context reset: old session dies, new password works, old password doesn't", async ({ browser }) => {
    const runId = newRunId()
    const originalPassword = "OriginalPass123"
    const newPassword = "BrandNewPass456"
    const { id: userId, email } = await createThrowawayUser({
      scenario: "reset",
      runId,
      password: originalPassword,
    })

    try {
      // Context A: logs in with the original password, confirms dashboard access.
      const contextA = await browser.newContext()
      const pageA = await contextA.newPage()
      await pageA.goto("/login")
      await pageA.locator("#email").fill(email)
      await pageA.locator("#password").fill(originalPassword)
      await pageA.getByRole("button", { name: "Masuk →" }).click()
      await pageA.waitForURL("/")
      await pageA.goto("/dashboard")
      await expect(pageA).toHaveURL(/\/dashboard$/)

      // Bypass real email: insert a valid reset token directly, matching the API's hashing.
      const rawToken = await createResetToken(userId)

      // Context B: resets the password using that token.
      const contextB = await browser.newContext()
      const pageB = await contextB.newPage()
      await pageB.goto(`/reset-password/${rawToken}`)
      await pageB.locator("#password").fill(newPassword)
      await pageB.locator("#confirmPassword").fill(newPassword)
      await pageB.getByRole("button", { name: "Simpan Password Baru →" }).click()
      await pageB.waitForURL(/\/login\?reset=success/)
      await contextB.close()

      // Context A's session should now be lazily invalidated on the next server-side auth() call.
      await pageA.goto("/dashboard")
      await pageA.waitForURL(/\/login/)
      await contextA.close()

      // Context C: new password works.
      const contextC = await browser.newContext()
      const pageC = await contextC.newPage()
      await pageC.goto("/login")
      await pageC.locator("#email").fill(email)
      await pageC.locator("#password").fill(newPassword)
      await pageC.getByRole("button", { name: "Masuk →" }).click()
      await pageC.waitForURL("/")
      await expect(pageC.getByText("Keluar")).toBeVisible()
      await contextC.close()

      // Context D: old password no longer works.
      const contextD = await browser.newContext()
      const pageD = await contextD.newPage()
      await pageD.goto("/login")
      await pageD.locator("#email").fill(email)
      await pageD.locator("#password").fill(originalPassword)
      await pageD.getByRole("button", { name: "Masuk →" }).click()
      await expect(pageD.getByText("Email atau kata sandi salah.")).toBeVisible()
      await contextD.close()
    } finally {
      await deleteThrowawayUser(userId)
    }
  })

  test("expired token — 410, password unchanged", async ({ page }) => {
    const runId = newRunId()
    const { id: userId, email } = await createThrowawayUser({ scenario: "expired", runId })
    const rawToken = await createResetToken(userId, { expiresInMs: -5 * 60 * 1000 })

    try {
      await page.goto(`/reset-password/${rawToken}`)
      await page.locator("#password").fill("SomeNewPass123")
      await page.locator("#confirmPassword").fill("SomeNewPass123")
      await page.getByRole("button", { name: "Simpan Password Baru →" }).click()
      await expect(
        page.getByText("Link reset password tidak valid atau sudah kedaluwarsa.")
      ).toBeVisible()

      const passwordChangedAt = await getUserPasswordChangedAt(email)
      expect(passwordChangedAt).toBeNull()
    } finally {
      await deleteThrowawayUser(userId)
    }
  })
})

test.describe("FR-AUTH-07 — suspending a user", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("suspend blocks subsequent login attempts", async ({ page, browser }) => {
    test.setTimeout(60_000)
    const runId = newRunId()
    const password = "SuspendMe123"
    const { id: userId, email } = await createThrowawayUser({ scenario: "suspend-login", runId, password })

    try {
      await page.goto("/dashboard/users?role=USER")
      const row = page.locator(".divide-y > div").filter({ hasText: email })
      await expect(row).toBeVisible()

      page.once("dialog", (dialog) => dialog.accept())
      await row.getByRole("button", { name: "Nonaktifkan" }).click()
      await expect(row.getByText("Nonaktif")).toBeVisible()

      // browser.newContext() otherwise inherits this describe block's `test.use({storageState:
      // "admin.json"})` as its default — an explicit empty storageState is required to get a
      // genuinely logged-out context here (confirmed via debug cookie dump during triage).
      const loginContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const loginPage = await loginContext.newPage()
      await loginPage.goto("/login")
      await loginPage.locator("#email").fill(email)
      await loginPage.locator("#password").fill(password)
      await loginPage.getByRole("button", { name: "Masuk →" }).click()
      await expect(loginPage.getByText("Email atau kata sandi salah.")).toBeVisible()
      await loginContext.close()
    } finally {
      await deleteThrowawayUser(userId)
    }
  })

  test("suspend kills an already-active session", async ({ page, browser }) => {
    test.setTimeout(60_000)
    const runId = newRunId()
    const password = "SuspendMeToo123"
    const { id: userId, email } = await createThrowawayUser({ scenario: "suspend-live", runId, password })

    try {
      // Same describe-level storageState inheritance quirk as the test above — force a clean context.
      const sessionContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const sessionPage = await sessionContext.newPage()
      await sessionPage.goto("/login")
      await sessionPage.locator("#email").fill(email)
      await sessionPage.locator("#password").fill(password)
      await sessionPage.getByRole("button", { name: "Masuk →" }).click()
      await sessionPage.waitForURL("/")
      await sessionPage.goto("/dashboard")
      await expect(sessionPage).toHaveURL(/\/dashboard$/)

      await page.goto("/dashboard/users?role=USER")
      const row = page.locator(".divide-y > div").filter({ hasText: email })
      page.once("dialog", (dialog) => dialog.accept())
      await row.getByRole("button", { name: "Nonaktifkan" }).click()
      await expect(row.getByText("Nonaktif")).toBeVisible()

      await sessionPage.goto("/dashboard")
      await sessionPage.waitForURL(/\/login/)
      await sessionContext.close()
    } finally {
      await deleteThrowawayUser(userId)
    }
  })
})
