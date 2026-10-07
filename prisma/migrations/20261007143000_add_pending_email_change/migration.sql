ALTER TABLE "users"
  ADD COLUMN "pending_email" VARCHAR(120),
  ADD COLUMN "pending_email_requested_at" TIMESTAMP(3),
  ADD COLUMN "pending_email_expires_at" TIMESTAMP(3),
  ADD COLUMN "pending_email_version" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "users_pending_email_expires_at_idx"
ON "users"("pending_email_expires_at");
