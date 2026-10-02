CREATE TABLE "investment_fiscal_pending_resolutions" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "pending_key" VARCHAR(200) NOT NULL,
  "fingerprint" CHAR(64) NOT NULL,
  "justification" VARCHAR(1000) NOT NULL,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_fiscal_pending_resolutions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "investment_fiscal_pending_resolutions_userId_year_fingerprint_key"
ON "investment_fiscal_pending_resolutions"("userId", "year", "fingerprint");

CREATE INDEX "investment_fiscal_pending_resolutions_userId_year_idx"
ON "investment_fiscal_pending_resolutions"("userId", "year");

CREATE INDEX "investment_fiscal_pending_resolutions_userId_year_pending_key_idx"
ON "investment_fiscal_pending_resolutions"("userId", "year", "pending_key");

ALTER TABLE "investment_fiscal_pending_resolutions"
ADD CONSTRAINT "investment_fiscal_pending_resolutions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
