CREATE TYPE "InvestmentTaxRecordSource" AS ENUM ('MANUAL', 'IMPORT');

CREATE TABLE "investment_tax_withholdings" (
  "id" TEXT NOT NULL,
  "asset_type" "InvestmentAssetType" NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "day" INTEGER NOT NULL,
  "source" "InvestmentTaxRecordSource" NOT NULL DEFAULT 'MANUAL',
  "note" VARCHAR(500),
  "userId" TEXT NOT NULL,
  "assetId" TEXT,
  "operation_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_tax_withholdings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "investment_tax_withholdings_amount_positive_check"
    CHECK ("amount_cents" > 0),
  CONSTRAINT "investment_tax_withholdings_month_check"
    CHECK ("month" BETWEEN 1 AND 12),
  CONSTRAINT "investment_tax_withholdings_day_check"
    CHECK ("day" BETWEEN 1 AND 31)
);

CREATE TABLE "investment_tax_payments" (
  "id" TEXT NOT NULL,
  "asset_type" "InvestmentAssetType" NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "competence_year" INTEGER NOT NULL,
  "competence_month" INTEGER NOT NULL,
  "code" VARCHAR(10) NOT NULL,
  "paid_year" INTEGER NOT NULL,
  "paid_month" INTEGER NOT NULL,
  "paid_day" INTEGER NOT NULL,
  "note" VARCHAR(500),
  "receipt_reference" VARCHAR(120),
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_tax_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "investment_tax_payments_amount_positive_check"
    CHECK ("amount_cents" > 0),
  CONSTRAINT "investment_tax_payments_competence_month_check"
    CHECK ("competence_month" BETWEEN 1 AND 12),
  CONSTRAINT "investment_tax_payments_paid_month_check"
    CHECK ("paid_month" BETWEEN 1 AND 12),
  CONSTRAINT "investment_tax_payments_paid_day_check"
    CHECK ("paid_day" BETWEEN 1 AND 31)
);

CREATE INDEX "investment_tax_withholdings_userId_year_month_idx"
ON "investment_tax_withholdings"("userId", "year", "month");

CREATE INDEX "investment_tax_withholdings_userId_asset_type_currency_year_month_idx"
ON "investment_tax_withholdings"("userId", "asset_type", "currency", "year", "month");

CREATE INDEX "investment_tax_withholdings_userId_assetId_year_month_idx"
ON "investment_tax_withholdings"("userId", "assetId", "year", "month");

CREATE INDEX "investment_tax_withholdings_userId_operation_id_idx"
ON "investment_tax_withholdings"("userId", "operation_id");

CREATE INDEX "investment_tax_payments_userId_competence_year_competence_month_idx"
ON "investment_tax_payments"("userId", "competence_year", "competence_month");

CREATE INDEX "investment_tax_payments_userId_asset_type_currency_competence_year_competence_month_idx"
ON "investment_tax_payments"("userId", "asset_type", "currency", "competence_year", "competence_month");

CREATE INDEX "investment_tax_payments_userId_paid_year_paid_month_paid_day_idx"
ON "investment_tax_payments"("userId", "paid_year", "paid_month", "paid_day");

ALTER TABLE "investment_tax_withholdings"
ADD CONSTRAINT "investment_tax_withholdings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_tax_withholdings"
ADD CONSTRAINT "investment_tax_withholdings_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "investment_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "investment_tax_withholdings"
ADD CONSTRAINT "investment_tax_withholdings_operation_id_fkey"
FOREIGN KEY ("operation_id") REFERENCES "investment_operations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "investment_tax_payments"
ADD CONSTRAINT "investment_tax_payments_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
