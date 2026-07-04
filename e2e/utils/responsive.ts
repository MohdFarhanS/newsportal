import type { Page } from "@playwright/test"

// Matches this project's own established manual-QA breakpoints (see CLAUDE.md
// "breakpoint 375/768/1024px" DoD checks) — not arbitrary Playwright defaults.
export const BREAKPOINTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
} as const

// Boundary pairs for precision-testing the two `md` (768px) nav toggles and the one
// `lg` (1024px) grid toggle — proving a breakpoint fires exactly where intended.
export const MD_BOUNDARY_BELOW = { width: 767, height: 1024 }
export const MD_BOUNDARY_AT = { width: 768, height: 1024 }
export const LG_BOUNDARY_BELOW = { width: 1023, height: 768 }
export const LG_BOUNDARY_AT = { width: 1024, height: 768 }

// 1px tolerance for scrollbar/subpixel rounding.
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}
