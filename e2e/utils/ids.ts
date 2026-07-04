export const E2E_EMAIL_DOMAIN = "test.newsportal.local"
export const E2E_TITLE_PREFIX = "[E2E]"

export function newRunId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function e2eEmail(scenario: string, runId: string): string {
  return `e2e-${scenario}-${runId}@${E2E_EMAIL_DOMAIN}`
}

export function e2eTitle(scenario: string, runId: string): string {
  return `${E2E_TITLE_PREFIX} ${scenario} ${runId}`
}
