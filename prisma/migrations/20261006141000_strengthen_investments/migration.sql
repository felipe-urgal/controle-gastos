ALTER TABLE "investment_operations"
  ADD COLUMN "sequence" INTEGER;

ALTER TABLE "investment_tax_withholdings"
  ADD COLUMN "import_fingerprint" CHAR(64);

CREATE UNIQUE INDEX "investment_tax_withholdings_userId_import_fingerprint_key"
ON "investment_tax_withholdings"("userId", "import_fingerprint");

CREATE TABLE "investment_mutation_requests" (
  "id" TEXT NOT NULL,
  "scope" VARCHAR(64) NOT NULL,
  "idempotency_key_hash" CHAR(64) NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "resource_id" VARCHAR(64),
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "investment_mutation_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "investment_mutation_requests_userId_scope_idempotency_key_hash_key"
ON "investment_mutation_requests"("userId", "scope", "idempotency_key_hash");

CREATE INDEX "investment_mutation_requests_userId_scope_created_at_idx"
ON "investment_mutation_requests"("userId", "scope", "created_at");

ALTER TABLE "investment_mutation_requests"
ADD CONSTRAINT "investment_mutation_requests_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "InvestmentTaxReviewStatus" AS ENUM ('PENDING', 'RESOLVED');

CREATE TABLE "investment_brokerage_tax_reviews" (
  "id" TEXT NOT NULL,
  "import_fingerprint" CHAR(64) NOT NULL,
  "note_number" VARCHAR(120) NOT NULL,
  "source_institution" VARCHAR(180) NOT NULL,
  "source_reference" VARCHAR(200),
  "amount_cents" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "day" INTEGER NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "status" "InvestmentTaxReviewStatus" NOT NULL DEFAULT 'PENDING',
  "resolved_at" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  "resolved_withholding_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "investment_brokerage_tax_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "investment_brokerage_tax_reviews_resolved_withholding_id_key"
ON "investment_brokerage_tax_reviews"("resolved_withholding_id");

CREATE UNIQUE INDEX "investment_brokerage_tax_reviews_userId_import_fingerprint_key"
ON "investment_brokerage_tax_reviews"("userId", "import_fingerprint");

CREATE INDEX "investment_brokerage_tax_reviews_userId_status_year_month_idx"
ON "investment_brokerage_tax_reviews"("userId", "status", "year", "month");

ALTER TABLE "investment_brokerage_tax_reviews"
ADD CONSTRAINT "investment_brokerage_tax_reviews_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_brokerage_tax_reviews"
ADD CONSTRAINT "investment_brokerage_tax_reviews_resolved_withholding_id_fkey"
FOREIGN KEY ("resolved_withholding_id") REFERENCES "investment_tax_withholdings"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
