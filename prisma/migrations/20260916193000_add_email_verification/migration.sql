ALTER TABLE "users"
ADD COLUMN "email_verified_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "auth_rate_limits_updated_at_idx"
ON "auth_rate_limits"("updated_at");
