import "dotenv/config"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import slugify from "slugify"
import { Client } from "pg"
import { E2E_EMAIL_DOMAIN, E2E_TITLE_PREFIX, e2eEmail, e2eTitle } from "./ids"

// Precomputed once — throwaway users created via createThrowawayUserFast() never log in,
// so the hash value is irrelevant. Avoids paying bcrypt cost-12 per row when seeding many
// (e.g. the users-list pagination fixture), unlike createThrowawayUser() which hashes a
// real per-call password because those accounts DO need to log in.
let fastPasswordHash: string | null = null
async function getFastPasswordHash(): Promise<string> {
  if (!fastPasswordHash) {
    fastPasswordHash = await bcrypt.hash("unused-fast-fixture-password", 12)
  }
  return fastPasswordHash
}

// Raw `pg` instead of the Prisma-generated client: Prisma 7's "prisma-client" generator emits
// ESM-only output (uses `import.meta.url`), which Playwright's default CJS test transform can't
// load. Going through `pg` directly sidesteps that entirely without touching generated/production code.

const client = new Client({ connectionString: process.env.DATABASE_URL! })
let connected = false

async function db() {
  if (!connected) {
    await client.connect()
    connected = true
  }
  return client
}

function newId(): string {
  return crypto.randomUUID()
}

// `pg`'s default Date serialization embeds the *local* timezone offset, but Postgres's
// `timestamp without time zone` columns (Prisma's default for DateTime) silently discard any
// offset and store the naive local wall-clock reading — on a UTC+7 machine this turns "1 second
// ago" into "~7 hours in the future" once read back. Explicit UTC ISO strings sidestep that,
// since Postgres also ignores the "Z" suffix but the underlying numeric clock reading is correct.
function toSql(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null
}

export type Role = "USER" | "JOURNALIST" | "EDITOR" | "ADMIN"
export type ArticleStatus = "DRAFT" | "REVIEW" | "REJECTED" | "SCHEDULED" | "PUBLISHED"

export type ArticleRow = {
  id: string
  authorId: string
  categoryId: string
  title: string
  slug: string
  status: ArticleStatus
  isFeatured: boolean
  rejectionNote: string | null
  scheduledAt: Date | null
  publishedAt: Date | null
}

// ---- Users ----

export async function createThrowawayUser(opts: {
  scenario: string
  runId: string
  role?: Role
  password?: string
  isActive?: boolean
  name?: string
}) {
  const c = await db()
  const password = opts.password ?? "Password123"
  const passwordHash = await bcrypt.hash(password, 12)
  const email = e2eEmail(opts.scenario, opts.runId)
  const id = newId()
  await c.query(
    `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now(), now())`,
    [id, opts.name ?? `E2E ${opts.scenario}`, email, passwordHash, opts.role ?? "USER", opts.isActive ?? true]
  )
  await c.query(`INSERT INTO profiles (id, user_id, updated_at) VALUES ($1, $2, now())`, [newId(), id])
  return { id, email, password }
}

export async function deleteThrowawayUser(userId: string) {
  const c = await db()
  // Article.authorId -> User has no onDelete cascade; must delete authored articles first.
  await c.query(`DELETE FROM articles WHERE author_id = $1`, [userId])
  await c.query(`DELETE FROM users WHERE id = $1`, [userId])
}

// Like createThrowawayUser, but skips per-row bcrypt hashing (shared precomputed hash) —
// for fixtures that only need to exist in a list/count (e.g. pagination), never log in.
export async function createThrowawayUserFast(opts: {
  scenario: string
  runId: string
  role?: Role
}): Promise<{ id: string; email: string }> {
  const c = await db()
  const passwordHash = await getFastPasswordHash()
  const email = e2eEmail(opts.scenario, opts.runId)
  const id = newId()
  await c.query(
    `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, now(), now())`,
    [id, `E2E ${opts.scenario}`, email, passwordHash, opts.role ?? "USER"]
  )
  await c.query(`INSERT INTO profiles (id, user_id, updated_at) VALUES ($1, $2, now())`, [newId(), id])
  return { id, email }
}

export async function setUserRoleDirect(userId: string, role: Role) {
  const c = await db()
  await c.query(`UPDATE users SET role = $2 WHERE id = $1`, [userId, role])
}

export async function setUserActiveDirect(userId: string, isActive: boolean) {
  const c = await db()
  await c.query(`UPDATE users SET is_active = $2 WHERE id = $1`, [userId, isActive])
}

export async function getUserIdByEmail(email: string): Promise<string> {
  const c = await db()
  const res = await c.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email])
  if (res.rows.length === 0) throw new Error(`No user found for email ${email}`)
  return res.rows[0].id
}

export async function getUserByEmail(
  email: string
): Promise<{ id: string; role: Role; isActive: boolean } | null> {
  const c = await db()
  const res = await c.query<{ id: string; role: Role; is_active: boolean }>(
    `SELECT id, role, is_active FROM users WHERE email = $1`,
    [email]
  )
  const row = res.rows[0]
  return row ? { id: row.id, role: row.role, isActive: row.is_active } : null
}

export async function countUsersByEmail(email: string): Promise<number> {
  const c = await db()
  const res = await c.query(`SELECT count(*)::int AS count FROM users WHERE email = $1`, [email])
  return res.rows[0].count
}

export async function getUserPasswordChangedAt(email: string): Promise<Date | null> {
  const c = await db()
  const res = await c.query<{ password_changed_at: Date | null }>(
    `SELECT password_changed_at FROM users WHERE email = $1`,
    [email]
  )
  return res.rows[0]?.password_changed_at ?? null
}

// ---- Password reset tokens ----

export async function createResetToken(
  userId: string,
  opts?: { expiresInMs?: number; alreadyUsed?: boolean }
) {
  const c = await db()
  const rawToken = crypto.randomBytes(32).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
  const expiresAt = new Date(Date.now() + (opts?.expiresInMs ?? 60 * 60 * 1000))
  await c.query(
    `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used_at, created_at)
     VALUES ($1, $2, $3, $4, $5, now())`,
    [newId(), userId, tokenHash, toSql(expiresAt), opts?.alreadyUsed ? toSql(new Date()) : null]
  )
  return rawToken
}

// ---- Categories & Tags ----

export async function createThrowawayCategory(opts: {
  scenario: string
  runId: string
  name?: string
}): Promise<{ id: string; name: string; slug: string }> {
  const c = await db()
  const name = opts.name ?? e2eTitle(opts.scenario, opts.runId)
  const slug = `${slugify(name, { lower: true, strict: true })}`
  const id = newId()
  await c.query(
    `INSERT INTO categories (id, name, slug, created_at, updated_at) VALUES ($1, $2, $3, now(), now())`,
    [id, name, slug]
  )
  return { id, name, slug }
}

export async function deleteCategoryById(id: string) {
  const c = await db()
  await c.query(`DELETE FROM categories WHERE id = $1`, [id])
}

// For cleaning up rows created purely through the UI (no id available from a db-side seed).
export async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const c = await db()
  const res = await c.query<{ id: string }>(`SELECT id FROM categories WHERE slug = $1`, [slug])
  return res.rows[0]?.id ?? null
}

export async function createThrowawayTag(opts: {
  scenario: string
  runId: string
  name?: string
}): Promise<{ id: string; name: string; slug: string }> {
  const c = await db()
  const name = opts.name ?? e2eTitle(opts.scenario, opts.runId)
  const slug = `${slugify(name, { lower: true, strict: true })}`
  const id = newId()
  await c.query(`INSERT INTO tags (id, name, slug, created_at) VALUES ($1, $2, $3, now())`, [id, name, slug])
  return { id, name, slug }
}

export async function deleteTagById(id: string) {
  const c = await db()
  await c.query(`DELETE FROM tags WHERE id = $1`, [id])
}

export async function getTagIdBySlug(slug: string): Promise<string | null> {
  const c = await db()
  const res = await c.query<{ id: string }>(`SELECT id FROM tags WHERE slug = $1`, [slug])
  return res.rows[0]?.id ?? null
}

export async function attachTagToArticle(articleId: string, tagId: string) {
  const c = await db()
  await c.query(`INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2)`, [articleId, tagId])
}

export async function getArticleTagIds(articleId: string): Promise<string[]> {
  const c = await db()
  const res = await c.query<{ tag_id: string }>(`SELECT tag_id FROM article_tags WHERE article_id = $1`, [articleId])
  return res.rows.map((r) => r.tag_id)
}

// ---- Articles ----

export async function seedArticleAtStatus(
  authorId: string,
  status: ArticleStatus,
  overrides?: {
    scenario?: string
    runId?: string
    title?: string
    publishedAt?: Date | null
    scheduledAt?: Date | null
    rejectionNote?: string | null
    categoryId?: string
  }
) {
  const c = await db()
  let categoryId = overrides?.categoryId
  if (!categoryId) {
    const categoryRes = await c.query<{ id: string }>(`SELECT id FROM categories LIMIT 1`)
    if (categoryRes.rows.length === 0) throw new Error("No Category rows found in dev DB — cannot seed article fixture")
    categoryId = categoryRes.rows[0].id
  }

  const runId = overrides?.runId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const title = overrides?.title ?? e2eTitle(overrides?.scenario ?? "seed", runId)
  const slug = `${slugify(title, { lower: true, strict: true })}-${runId}`
  const id = newId()

  const publishedAt = overrides?.publishedAt ?? (status === "PUBLISHED" ? new Date() : null)
  const scheduledAt = overrides?.scheduledAt ?? (status === "SCHEDULED" ? new Date(Date.now() + 60 * 60 * 1000) : null)
  const rejectionNote = overrides?.rejectionNote ?? (status === "REJECTED" ? "Catatan penolakan uji coba E2E." : null)

  await c.query(
    `INSERT INTO articles
       (id, author_id, category_id, title, slug, excerpt, content, status, is_featured,
        rejection_note, scheduled_at, published_at, view_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11, 0, now(), now())`,
    [
      id,
      authorId,
      categoryId,
      title,
      slug,
      "Ringkasan artikel uji coba E2E untuk keperluan pengujian otomatis.",
      "<p>Konten artikel uji coba E2E.</p>",
      status,
      rejectionNote,
      toSql(scheduledAt),
      toSql(publishedAt),
    ]
  )
  return { id, slug, title }
}

export async function deleteArticleById(id: string) {
  const c = await db()
  await c.query(`DELETE FROM articles WHERE id = $1`, [id])
}

// For deterministically forcing FeaturedSection's two-column layout in reflow tests —
// seedArticleAtStatus always inserts is_featured=false, this flips it after the fact.
export async function setFeatured(articleIds: string[]) {
  const c = await db()
  await c.query(`UPDATE articles SET is_featured = true WHERE id = ANY($1)`, [articleIds])
}

export async function getArticleRaw(id: string): Promise<ArticleRow | null> {
  const c = await db()
  const res = await c.query(
    `SELECT id, author_id, category_id, title, slug, status, is_featured, rejection_note, scheduled_at, published_at
     FROM articles WHERE id = $1`,
    [id]
  )
  if (res.rows.length === 0) return null
  const row = res.rows[0]
  return {
    id: row.id,
    authorId: row.author_id,
    categoryId: row.category_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    isFeatured: row.is_featured,
    rejectionNote: row.rejection_note,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
  }
}

export async function updateArticleScheduledAt(id: string, scheduledAt: Date) {
  const c = await db()
  await c.query(`UPDATE articles SET scheduled_at = $2 WHERE id = $1`, [id, toSql(scheduledAt)])
}

export async function countFeaturedAmong(ids: string[]): Promise<number> {
  const c = await db()
  const res = await c.query(
    `SELECT count(*)::int AS count FROM articles WHERE id = ANY($1) AND is_featured = true`,
    [ids]
  )
  return res.rows[0].count
}

// ---- Featured isolation ----

export async function snapshotFeaturedState(): Promise<string[]> {
  const c = await db()
  const res = await c.query<{ id: string }>(
    `SELECT id FROM articles WHERE is_featured = true AND status = 'PUBLISHED'`
  )
  return res.rows.map((r) => r.id)
}

export async function restoreFeaturedState(originalIds: string[], touchedIds: string[]) {
  const c = await db()
  const allTouched = Array.from(new Set([...touchedIds, ...originalIds]))
  if (allTouched.length) {
    await c.query(`UPDATE articles SET is_featured = false WHERE id = ANY($1)`, [allTouched])
  }
  if (originalIds.length) {
    await c.query(`UPDATE articles SET is_featured = true WHERE id = ANY($1)`, [originalIds])
  }
}

// ---- Bookmarks ----

export async function seedBookmark(userId: string, articleId: string, createdAt?: Date): Promise<{ id: string }> {
  const c = await db()
  const id = newId()
  await c.query(
    `INSERT INTO bookmarks (id, user_id, article_id, created_at) VALUES ($1, $2, $3, $4)`,
    [id, userId, articleId, toSql(createdAt) ?? new Date().toISOString()]
  )
  return { id }
}

export async function getBookmarkRaw(userId: string, articleId: string): Promise<{ id: string; createdAt: Date } | null> {
  const c = await db()
  const res = await c.query<{ id: string; created_at: Date }>(
    `SELECT id, created_at FROM bookmarks WHERE user_id = $1 AND article_id = $2`,
    [userId, articleId]
  )
  const row = res.rows[0]
  return row ? { id: row.id, createdAt: row.created_at } : null
}

// These two tables are never seeded outside of E2E fixtures — safe to hard-reset a fixed test
// account before empty-state/pagination assertions where an absolute count/emptiness matters.
export async function deleteAllBookmarksForUser(userId: string) {
  const c = await db()
  await c.query(`DELETE FROM bookmarks WHERE user_id = $1`, [userId])
}

// ---- Reading History ----

export async function seedReadingHistory(userId: string, articleId: string, readAt?: Date): Promise<{ id: string }> {
  const c = await db()
  const id = newId()
  await c.query(
    `INSERT INTO reading_history (id, user_id, article_id, read_at) VALUES ($1, $2, $3, $4)`,
    [id, userId, articleId, toSql(readAt) ?? new Date().toISOString()]
  )
  return { id }
}

export async function getReadingHistoryRaw(userId: string, articleId: string): Promise<{ id: string; readAt: Date } | null> {
  const c = await db()
  const res = await c.query<{ id: string; read_at: Date }>(
    `SELECT id, read_at FROM reading_history WHERE user_id = $1 AND article_id = $2`,
    [userId, articleId]
  )
  const row = res.rows[0]
  return row ? { id: row.id, readAt: row.read_at } : null
}

export async function deleteAllReadingHistoryForUser(userId: string) {
  const c = await db()
  await c.query(`DELETE FROM reading_history WHERE user_id = $1`, [userId])
}

// ---- Safety-net sweep ----

export async function sweepLeftoverE2eData() {
  const c = await db()
  const users = await c.query<{ id: string }>(`SELECT id FROM users WHERE email LIKE $1`, [`%@${E2E_EMAIL_DOMAIN}`])
  const userIds = users.rows.map((u) => u.id)
  if (userIds.length) {
    await c.query(`DELETE FROM articles WHERE author_id = ANY($1)`, [userIds])
  }
  await c.query(`DELETE FROM articles WHERE title LIKE $1`, [`${E2E_TITLE_PREFIX}%`])
  if (userIds.length) {
    await c.query(`DELETE FROM users WHERE id = ANY($1)`, [userIds])
  }
  // Articles are gone by this point, so categories/tags with no remaining references
  // are safe to remove regardless of order (Category is implicit Restrict, Tag/ArticleTag cascade).
  await c.query(`DELETE FROM categories WHERE name LIKE $1`, [`${E2E_TITLE_PREFIX}%`])
  await c.query(`DELETE FROM tags WHERE name LIKE $1`, [`${E2E_TITLE_PREFIX}%`])
}

export async function disconnectTestDb() {
  if (connected) {
    await client.end()
    connected = false
  }
}
