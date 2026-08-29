-- Security boundary: reset links issued before this deployment stored raw tokens.
-- Invalidate them before enforcing hash-only storage.
DELETE FROM "password_reset_tokens";

ALTER TABLE "password_reset_tokens"
ALTER COLUMN "token" TYPE CHAR(64);

-- CreateTable
CREATE TABLE "auth_rate_limits" (
    "id" TEXT NOT NULL,
    "key" CHAR(64) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_rate_limits_key_action_key" ON "auth_rate_limits"("key", "action");

-- CreateIndex
CREATE INDEX "auth_rate_limits_blocked_until_idx" ON "auth_rate_limits"("blocked_until");
