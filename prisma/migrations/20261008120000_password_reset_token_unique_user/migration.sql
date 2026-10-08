-- Mantém apenas o token mais recente por usuário antes de impor unicidade.
DELETE FROM "password_reset_tokens" a
USING "password_reset_tokens" b
WHERE a."userId" = b."userId"
  AND (a."created_at", a."id") < (b."created_at", b."id");

DROP INDEX IF EXISTS "password_reset_tokens_userId_idx";

CREATE UNIQUE INDEX "password_reset_tokens_userId_key"
ON "password_reset_tokens"("userId");
