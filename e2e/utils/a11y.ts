import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"
import type { Result } from "axe-core"

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]

// Waits for network-idle and webfonts before scanning — required because this app has
// post-hydration ARIA state (BookmarkButton, history buttons) that differs from the
// pre-hydration DOM, and color-contrast measurement depends on next/font being fully loaded.
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle")
  await page.evaluate(() => document.fonts.ready)
}

export async function scanForViolations(
  page: Page,
  opts?: { include?: string; exclude?: string[]; rules?: "structural" | "contrast" }
): Promise<Result[]> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS)

  if (opts?.rules === "contrast") {
    builder = builder.withRules(["color-contrast"])
  } else {
    builder = builder.disableRules(["color-contrast"])
  }

  if (opts?.include) builder = builder.include(opts.include)
  if (opts?.exclude) for (const sel of opts.exclude) builder = builder.exclude(sel)

  const results = await builder.analyze()
  return results.violations
}

export function formatViolations(violations: Result[]): string {
  if (violations.length === 0) return "No violations."
  return violations
    .map((v) => {
      const targets = v.nodes.map((n) => n.target.join(" ")).join(", ")
      return `[${v.impact ?? "unknown"}] ${v.id}: ${v.help}\n  targets: ${targets}\n  ${v.helpUrl}`
    })
    .join("\n\n")
}

export function splitByImpact(violations: Result[]) {
  const blocking = violations.filter((v) => v.impact === "critical" || v.impact === "serious")
  const nonBlocking = violations.filter((v) => v.impact === "moderate" || v.impact === "minor")
  return { blocking, nonBlocking }
}
