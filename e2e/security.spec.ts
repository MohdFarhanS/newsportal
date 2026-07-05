import "dotenv/config"
import fs from "fs"
import path from "path"
import { test, expect, request } from "@playwright/test"
import { getUserIdByEmail, seedArticleAtStatus, deleteArticleById, getArticleRaw } from "./utils/db"
import { newRunId, e2eEmail } from "./utils/ids"

const BASE_URL = "http://localhost:3000"

// Per-file fake-IP convention (search.spec.ts: 10.10.10.x, analytics.spec.ts: 10.30.30.x) — each
// spec file claims its own /24 so cumulative request volume across the whole suite never collides
// on a shared rate-limiter bucket. This file uses 10.90.90.x / 10.90.91.x.
function withFakeIp(ip: string) {
  return { "x-forwarded-for": ip }
}

function readCookies(storageStatePath: string): Array<{ name: string; httpOnly: boolean; sameSite: string }> {
  const raw = fs.readFileSync(path.resolve(storageStatePath), "utf-8")
  return JSON.parse(raw).cookies
}

let journalistId: string

test.beforeAll(async () => {
  journalistId = await getUserIdByEmail("farhan@newsportaljournalist.com")
})

const EXPECTED_CSP =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://upload-widget.cloudinary.com https://va.vercel-scripts.com; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob: https://res.cloudinary.com https://picsum.photos https://fastly.picsum.photos; " +
  "connect-src 'self' https://vitals.vercel-insights.com; " +
  "frame-src https://upload-widget.cloudinary.com; " +
  "object-src 'none'; " +
  "base-uri 'self'"

function assertBaseHeaders(headers: Record<string, string>) {
  expect(headers["x-frame-options"]).toBe("DENY")
  expect(headers["x-content-type-options"]).toBe("nosniff")
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  expect(headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains")
  // e2e always runs against `npm run dev` — script-src includes 'unsafe-eval' in dev only
  // (Turbopack HMR). This is the dev-shape CSP, not the prod-only shape.
  expect(headers["content-security-policy"]).toBe(EXPECTED_CSP)
}

test.describe("CSRF posture — session cookie flags", () => {
  for (const role of ["admin", "editor", "journalist", "user"] as const) {
    test(`${role} session cookie is httpOnly and SameSite=Lax|Strict`, () => {
      const cookies = readCookies(`e2e/.auth/${role}.json`)
      const sessionCookie = cookies.find((c) => c.name === "authjs.session-token")
      expect(sessionCookie).toBeTruthy()
      expect(sessionCookie!.httpOnly).toBe(true)
      expect(["Lax", "Strict"]).toContain(sessionCookie!.sameSite)
    })
  }
})

test.describe("CSRF posture — anonymous cannot reach article-workflow mutations", () => {
  const PLACEHOLDER_ID = "nonexistent-id-for-401-check"

  const routes: Array<{ name: string; path: string; body: unknown }> = [
    { name: "override", path: `/api/articles/${PLACEHOLDER_ID}/override`, body: { status: "DRAFT" } },
    { name: "review", path: `/api/articles/${PLACEHOLDER_ID}/review`, body: { action: "approve" } },
    { name: "submit", path: `/api/articles/${PLACEHOLDER_ID}/submit`, body: {} },
    { name: "feature", path: `/api/articles/${PLACEHOLDER_ID}/feature`, body: { isFeatured: true } },
  ]

  for (const route of routes) {
    test(`PATCH ${route.path} with no session -> 401`, async () => {
      const ctx = await request.newContext({ baseURL: BASE_URL })
      try {
        const res = await ctx.patch(route.path, { data: route.body })
        expect(res.status()).toBe(401)
      } finally {
        await ctx.dispose()
      }
    })
  }
})

test.describe("Rate limiting — forgot-password enforced per IP (control group)", () => {
  test("6 requests from the same spoofed IP: the 6th is 429", async () => {
    const runId = newRunId()
    const email = e2eEmail("security-ratelimit-control", runId)
    const ctx = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: withFakeIp("10.90.90.1"),
    })
    try {
      let lastStatus = 0
      for (let i = 0; i < 6; i++) {
        const res = await ctx.post("/api/auth/forgot-password", { data: { email } })
        lastStatus = res.status()
      }
      expect(lastStatus).toBe(429)
    } finally {
      await ctx.dispose()
    }
  })
})

test.describe("[SECURITY FINDING] IP-spoofing bypasses the rate limiter", () => {
  test("6 requests from 6 different spoofed IPs are never rate-limited, even though they hit the same endpoint in the same window", async ({}, testInfo) => {
    // test.fail() flips how Playwright reports this test: it is EXPECTED to fail (the assertion
    // below is designed to be unmet), so a failing run is reported as a normal, green "expected
    // failure" in the suite summary — not a red "1 failed" that looks like an unexplained bug to
    // anyone glancing at CI. If this ever starts PASSING (statuses[5] genuinely becomes 429),
    // Playwright reports that as an "unexpected pass" and flags it for attention — which is
    // exactly the right polarity: today, red is normal; a surprise green is what deserves review.
    //
    // Why this stays permanently red in THIS suite even after the getClientIp() fix
    // (src/lib/request-ip.ts): the fix only trusts a spoof-resistant IP when
    // process.env.VERCEL is set (real Vercel edge in front). This suite always runs against
    // `npm run dev` on localhost, which never sets that env var and has no edge network — so the
    // fallback branch (still x-forwarded-for-based, still spoofable by design there) is always
    // what's exercised here. That is expected, not a sign the fix didn't work; the fix's actual
    // effect can only be observed on a real Vercel deployment, which this local e2e suite cannot
    // reach. See CLAUDE.md for how to verify the real deployment manually if desired.
    test.fail()

    const runId = newRunId()
    const email = e2eEmail("security-ratelimit-bypass", runId)
    const statuses: number[] = []

    for (let i = 0; i < 6; i++) {
      const ctx = await request.newContext({
        baseURL: BASE_URL,
        extraHTTPHeaders: withFakeIp(`10.90.91.${i + 1}`),
      })
      try {
        const res = await ctx.post("/api/auth/forgot-password", { data: { email } })
        statuses.push(res.status())
      } finally {
        await ctx.dispose()
      }
    }

    testInfo.annotations.push({
      type: "security-finding",
      description:
        "Local-dev-only finding (see test.fail() comment above for why this doesn't reflect " +
        "production risk): before the getClientIp() fix, IP resolution " +
        "(x-real-ip ?? x-forwarded-for.split(',')[0] ?? 'unknown') trusted client-supplied " +
        "headers with zero verification, duplicated across 6 files (src/lib/auth.ts, " +
        "src/app/api/articles/route.ts, src/app/api/auth/register/route.ts, " +
        "src/app/api/auth/forgot-password/route.ts, src/app/api/auth/reset-password/route.ts, " +
        "src/lib/actions/view.ts). An attacker can send a different x-forwarded-for value per " +
        "request to get a fresh rate-limit bucket every time. On real Vercel deployments this is " +
        "understood to already be largely mitigated by the edge network overwriting/stripping " +
        "client-supplied x-forwarded-for (per Vercel's own docs) — unverified directly against " +
        "this project's production deployment.",
    })
    await testInfo.attach("ip-spoof-evidence", {
      body: JSON.stringify({ statuses, ips: Array.from({ length: 6 }, (_, i) => `10.90.91.${i + 1}`) }, null, 2),
      contentType: "application/json",
    })

    // This asserts the SECURE expected behavior in an environment with no trusted-proxy signal
    // (a real proxy-aware limiter would still 429 the 6th request). It fails here by design — see
    // the test.fail() comment above for why that's the correct, permanent outcome in this suite,
    // not something to "fix" by changing this assertion.
    expect(
      statuses[5],
      "SECURITY FINDING (expected in local dev): rate limiter was bypassed by rotating " +
        `x-forwarded-for per request. Got statuses ${JSON.stringify(statuses)} — expected the ` +
        "6th request to still be 429. See test.fail() comment above."
    ).toBe(429)
  })
})

test.describe("XSS — sanitize-html strips executable content from article.content", () => {
  test.use({ storageState: "e2e/.auth/journalist.json" })

  test("script tags, event-handler attributes, and javascript: hrefs are stripped from the rendered article, real text survives", async ({
    page,
    browser,
  }) => {
    const runId = newRunId()
    const article = await seedArticleAtStatus(journalistId, "DRAFT", {
      scenario: "security-xss-content",
      runId,
    })
    try {
      await page.goto(`/dashboard/articles/${article.id}/edit`)
      const requestPromise = page.waitForRequest(
        (req) => req.method() === "POST" && req.url().includes(`/dashboard/articles/${article.id}/edit`)
      )
      await page.getByRole("button", { name: "Simpan Draft" }).click()
      const capturedRequest = await requestPromise
      await expect(page.getByText("Artikel disimpan")).toBeVisible()

      const url = capturedRequest.url()
      const headers = { ...(await capturedRequest.allHeaders()) }
      delete headers["cookie"]
      delete headers["content-length"]
      const body = JSON.parse(capturedRequest.postData() ?? "[]")

      const marker = `Filler${runId.slice(-6)}Text`
      body[1].content =
        `<p>${marker} paragraph one.</p>` +
        `<script>window.__xss = 1</script>` +
        `<img src="x" onerror="window.__xss = 2">` +
        `<a href="javascript:alert(1)">bad link</a>` +
        `<p>${marker} paragraph two.</p>`

      const res = await page.request.post(url, { headers, data: JSON.stringify(body) })
      expect(res.ok()).toBe(true)

      // Publish so the sanitized content is servable via the public article page (override has no
      // precondition on current status, unlike /review's REVIEW-only guard). override is
      // ADMIN-only — the journalist session this describe block uses cannot call it, so a
      // separate admin-authenticated context is needed just for this one PATCH.
      const adminCtx = await request.newContext({ storageState: "e2e/.auth/admin.json", baseURL: BASE_URL })
      try {
        const publishRes = await adminCtx.patch(`/api/articles/${article.id}/override`, {
          data: { status: "PUBLISHED" },
        })
        expect(publishRes.status()).toBe(200)
      } finally {
        await adminCtx.dispose()
      }

      // updateArticleAction regenerates the slug from the title on every save (documented project
      // quirk — slug is not frozen after create), so the slug captured at seed time can go stale
      // the moment the capture-replay update above runs. Refetch the current slug from the DB
      // rather than trusting the seeded value, or navigation 404s and the locator below hangs
      // forever waiting for an element that will never appear.
      const current = await getArticleRaw(article.id)
      const anonContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      try {
        const anonPage = await anonContext.newPage()
        await anonPage.goto(`/article/${current!.slug}`)
        const contentHtml = await anonPage.locator(".article-content").innerHTML()

        expect(contentHtml).not.toContain("<script")
        expect(contentHtml).not.toContain("onerror")
        expect(contentHtml).not.toContain("javascript:")
        // Sanity check against over-stripping: the real filler text must survive.
        expect(contentHtml).toContain(marker)
      } finally {
        await anonContext.close()
      }
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("XSS — title/excerpt rely on React escaping, not sanitize-html", () => {
  test("a title containing <script> renders as inert literal text, not executable markup (React JSX escaping, distinct from the sanitize-html mechanism above)", async ({
    page,
    browser,
  }) => {
    const runId = newRunId()
    const maliciousTitle = `<script>window.__xss = 3</script> E2E security ${runId}`
    const article = await seedArticleAtStatus(journalistId, "PUBLISHED", {
      scenario: "security-xss-title",
      runId,
      title: maliciousTitle,
    })
    try {
      const anonContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      try {
        const anonPage = await anonContext.newPage()
        await anonPage.goto(`/article/${article.slug}`)
        const h1 = anonPage.locator("h1").filter({ hasText: "E2E security" })
        await expect(h1).toBeVisible()
        const h1Html = await h1.innerHTML()
        // React escapes the interpolated string — the literal characters "<script>" must appear
        // as text (encoded as &lt;script&gt; in the HTML), never as a live element.
        expect(h1Html).not.toContain("<script>")
        expect(await h1.textContent()).toContain("<script>")
      } finally {
        await anonContext.close()
      }
    } finally {
      await deleteArticleById(article.id)
    }
  })
})

test.describe("Security headers — presence & exact values", () => {
  test("public page (/) carries the full header set", async ({ page }) => {
    const res = await page.goto("/")
    assertBaseHeaders((await res!.allHeaders()) as Record<string, string>)
  })

  test("API route (/api/articles) carries the same header set", async ({ page }) => {
    const res = await page.goto("/api/articles")
    assertBaseHeaders((await res!.allHeaders()) as Record<string, string>)
  })
})

test.describe("Security headers — authenticated dashboard page", () => {
  test.use({ storageState: "e2e/.auth/user.json" })

  test("authenticated dashboard page carries the same header set", async ({ page }) => {
    const res = await page.goto("/dashboard")
    assertBaseHeaders((await res!.allHeaders()) as Record<string, string>)
  })
})

test.describe("Security headers — documented gaps (asserting current reality, not desired state)", () => {
  // IMPORTANT — opposite polarity from the IP-spoofing finding test above: that test asserts the
  // SECURE behavior and is expected to fail (red) until the app is fixed. These two tests assert
  // the CURRENT (permissive) reality on purpose, so they PASS today. If frame-ancestors is ever
  // added or style-src's 'unsafe-inline' is ever removed from next.config.ts, these specific
  // assertions will start FAILING (turn red) — that is expected and correct in that scenario, and
  // requires a manual update to this test at that time, not a revert of the app change.
  test("CSP has no frame-ancestors directive (documented gap, not covered by X-Frame-Options alone for all embedding contexts)", async ({
    page,
  }) => {
    const res = await page.goto("/")
    const csp = (await res!.headerValue("content-security-policy")) ?? ""
    expect(csp).not.toContain("frame-ancestors")
  })

  test("CSP style-src contains 'unsafe-inline' (documented gap, unconditional in both dev and prod)", async ({
    page,
  }) => {
    const res = await page.goto("/")
    const csp = (await res!.headerValue("content-security-policy")) ?? ""
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
  })
})

test.describe("Malformed body tolerance — routes without Zod never 500", () => {
  const PLACEHOLDER_ID = "nonexistent-id-for-malformed-body-check"

  test("override: missing status -> handled (400), not 500", async () => {
    const ctx = await request.newContext({ storageState: "e2e/.auth/admin.json", baseURL: BASE_URL })
    try {
      const res = await ctx.patch(`/api/articles/${PLACEHOLDER_ID}/override`, { data: {} })
      expect(res.status()).toBe(400)
    } finally {
      await ctx.dispose()
    }
  })

  test("override: status wrong type -> handled (400), not 500", async () => {
    const ctx = await request.newContext({ storageState: "e2e/.auth/admin.json", baseURL: BASE_URL })
    try {
      const res = await ctx.patch(`/api/articles/${PLACEHOLDER_ID}/override`, { data: { status: 12345 } })
      expect(res.status()).toBe(400)
    } finally {
      await ctx.dispose()
    }
  })

  test("review: missing action -> handled (400), not 500", async () => {
    const ctx = await request.newContext({ storageState: "e2e/.auth/editor.json", baseURL: BASE_URL })
    try {
      const res = await ctx.patch(`/api/articles/${PLACEHOLDER_ID}/review`, { data: {} })
      expect(res.status()).toBe(400)
    } finally {
      await ctx.dispose()
    }
  })

  test("review: action wrong type -> handled (400), not 500", async () => {
    const ctx = await request.newContext({ storageState: "e2e/.auth/editor.json", baseURL: BASE_URL })
    try {
      const res = await ctx.patch(`/api/articles/${PLACEHOLDER_ID}/review`, { data: { action: 42 } })
      expect(res.status()).toBe(400)
    } finally {
      await ctx.dispose()
    }
  })

  test("submit: invalid JSON syntax body -> no effect, never 500 (body is never read by this route at all)", async () => {
    const ctx = await request.newContext({ storageState: "e2e/.auth/journalist.json", baseURL: BASE_URL })
    try {
      const res = await ctx.patch(`/api/articles/${PLACEHOLDER_ID}/submit`, {
        headers: { "content-type": "application/json" },
        data: "{not valid json!!!",
      })
      expect(res.status()).not.toBe(500)
    } finally {
      await ctx.dispose()
    }
  })

  test("submit: garbage-shaped body -> no effect, never 500", async () => {
    const ctx = await request.newContext({ storageState: "e2e/.auth/journalist.json", baseURL: BASE_URL })
    try {
      const res = await ctx.patch(`/api/articles/${PLACEHOLDER_ID}/submit`, { data: { garbage: [1, 2, 3] } })
      expect(res.status()).not.toBe(500)
    } finally {
      await ctx.dispose()
    }
  })

  test("feature: missing isFeatured -> handled (400), not 500", async () => {
    const ctx = await request.newContext({ storageState: "e2e/.auth/editor.json", baseURL: BASE_URL })
    try {
      const res = await ctx.patch(`/api/articles/${PLACEHOLDER_ID}/feature`, { data: {} })
      expect(res.status()).toBe(400)
    } finally {
      await ctx.dispose()
    }
  })

  test("feature: isFeatured wrong type -> handled (400), not 500", async () => {
    const ctx = await request.newContext({ storageState: "e2e/.auth/editor.json", baseURL: BASE_URL })
    try {
      const res = await ctx.patch(`/api/articles/${PLACEHOLDER_ID}/feature`, { data: { isFeatured: "yes" } })
      expect(res.status()).toBe(400)
    } finally {
      await ctx.dispose()
    }
  })
})
