import { test as setup, expect } from "@playwright/test"

const ACCOUNTS = {
  admin: { email: "farhan@newsportaladmin.com", password: "password1121" },
  editor: { email: "farhan@newsportaleditor.com", password: "password1121" },
  journalist: { email: "farhan@newsportaljournalist.com", password: "password1121" },
  user: { email: "farhan@newsportaluser.com", password: "password1121" },
} as const

for (const [role, creds] of Object.entries(ACCOUNTS)) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await page.goto("/login")
    await page.locator("#email").fill(creds.email)
    await page.locator("#password").fill(creds.password)
    await page.getByRole("button", { name: "Masuk →" }).click()
    await page.waitForURL("/")
    await expect(page.getByText("Keluar")).toBeVisible()
    await page.context().storageState({ path: `e2e/.auth/${role}.json` })
  })
}
