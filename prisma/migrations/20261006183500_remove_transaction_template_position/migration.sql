DROP INDEX IF EXISTS "transaction_templates_userId_is_favorite_position_idx";

ALTER TABLE "transaction_templates"
DROP COLUMN "position";

CREATE INDEX "transaction_templates_userId_is_favorite_updated_at_idx"
ON "transaction_templates"("userId", "is_favorite", "updated_at");
