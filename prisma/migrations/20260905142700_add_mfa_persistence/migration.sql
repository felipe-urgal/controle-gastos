-- Runs after recurrence and import-rule persistence by timestamp; MFA changes are independent.
-- AlterTable
ALTER TABLE "users"
ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totp_secret_encrypted" TEXT,
ADD COLUMN "totp_activated_at" TIMESTAMP(3),
ADD COLUMN "totp_last_used_step" BIGINT;

-- Disabled users must not retain active TOTP material. Enabled users need a
-- confirmed encrypted secret and activation timestamp.
ALTER TABLE "users"
ADD CONSTRAINT "users_totp_state_check"
CHECK (
  (
    "totp_enabled" = false AND
    "totp_secret_encrypted" IS NULL AND
    "totp_activated_at" IS NULL AND
    "totp_last_used_step" IS NULL
  ) OR
  (
    "totp_enabled" = true AND
    "totp_secret_encrypted" IS NOT NULL AND
    "totp_activated_at" IS NOT NULL
  )
);

-- CreateTable
CREATE TABLE "totp_recovery_codes" (
    "id" TEXT NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "used_at" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "totp_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_login_challenges" (
    "id" TEXT NOT NULL,
    "jti_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_login_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "totp_recovery_codes_userId_code_hash_key"
ON "totp_recovery_codes"("userId", "code_hash");

CREATE INDEX "totp_recovery_codes_userId_used_at_idx"
ON "totp_recovery_codes"("userId", "used_at");

CREATE UNIQUE INDEX "mfa_login_challenges_jti_hash_key"
ON "mfa_login_challenges"("jti_hash");

CREATE INDEX "mfa_login_challenges_userId_expires_at_idx"
ON "mfa_login_challenges"("userId", "expires_at");

CREATE INDEX "mfa_login_challenges_expires_at_consumed_at_idx"
ON "mfa_login_challenges"("expires_at", "consumed_at");

-- ForeignKeys
ALTER TABLE "totp_recovery_codes"
ADD CONSTRAINT "totp_recovery_codes_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mfa_login_challenges"
ADD CONSTRAINT "mfa_login_challenges_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
