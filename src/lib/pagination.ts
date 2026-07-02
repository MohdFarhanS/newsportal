const MAX_PAGE = 100_000

/**
 * Parses a `?page=` search param into a safe positive integer.
 * Rejects non-integer/non-finite input (e.g. "Infinity", "1e21", "2.5") by
 * falling back to 1 instead of propagating it into Prisma `skip` calculations.
 */
export function parsePage(raw: string | undefined, max = MAX_PAGE): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 && n <= max ? n : 1
}
