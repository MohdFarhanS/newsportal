-- Enable pg_trgm for case-insensitive ILIKE search (searchArticles)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes on article text search columns
CREATE INDEX IF NOT EXISTS "articles_title_trgm_idx" ON "articles" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "articles_excerpt_trgm_idx" ON "articles" USING gin (excerpt gin_trgm_ops);

-- DropIndex
DROP INDEX "password_reset_tokens_token_idx";

-- CreateIndex
CREATE INDEX "article_tags_tag_id_idx" ON "article_tags"("tag_id");

-- CreateIndex
CREATE INDEX "article_views_article_id_viewer_hash_viewed_at_idx" ON "article_views"("article_id", "viewer_hash", "viewed_at");

-- CreateIndex
CREATE INDEX "articles_author_id_updated_at_idx" ON "articles"("author_id", "updated_at");

-- CreateIndex
CREATE INDEX "articles_author_id_status_published_at_idx" ON "articles"("author_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "bookmarks_article_id_idx" ON "bookmarks"("article_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "reading_history_article_id_idx" ON "reading_history"("article_id");
