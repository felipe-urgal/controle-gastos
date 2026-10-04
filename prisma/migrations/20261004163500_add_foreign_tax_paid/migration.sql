CREATE TYPE "ForeignTaxEligibilityBasis" AS ENUM ('TREATY', 'RECIPROCITY');

CREATE TABLE "investment_foreign_taxes_paid" (
    "id" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "paid_year" INTEGER NOT NULL,
    "paid_month" INTEGER NOT NULL,
    "paid_day" INTEGER NOT NULL,
    "eligibility_basis" "ForeignTaxEligibilityBasis" NOT NULL,
    "non_refundable_confirmed" BOOLEAN NOT NULL,
    "note" VARCHAR(500),
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "income_id" TEXT,
    "fiscal_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_foreign_taxes_paid_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "investment_foreign_taxes_paid_exactly_one_event_check"
      CHECK (
        ("income_id" IS NOT NULL AND "fiscal_event_id" IS NULL)
        OR
        ("income_id" IS NULL AND "fiscal_event_id" IS NOT NULL)
      )
);

CREATE INDEX "investment_foreign_taxes_paid_userId_paid_year_paid_month_paid_day_idx"
ON "investment_foreign_taxes_paid"("userId", "paid_year", "paid_month", "paid_day");

CREATE INDEX "investment_foreign_taxes_paid_userId_assetId_paid_year_idx"
ON "investment_foreign_taxes_paid"("userId", "assetId", "paid_year");

CREATE INDEX "investment_foreign_taxes_paid_userId_income_id_idx"
ON "investment_foreign_taxes_paid"("userId", "income_id");

CREATE INDEX "investment_foreign_taxes_paid_userId_fiscal_event_id_idx"
ON "investment_foreign_taxes_paid"("userId", "fiscal_event_id");

ALTER TABLE "investment_foreign_taxes_paid"
ADD CONSTRAINT "investment_foreign_taxes_paid_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_foreign_taxes_paid"
ADD CONSTRAINT "investment_foreign_taxes_paid_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "investment_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "investment_foreign_taxes_paid"
ADD CONSTRAINT "investment_foreign_taxes_paid_income_id_fkey"
FOREIGN KEY ("income_id") REFERENCES "investment_incomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "investment_foreign_taxes_paid"
ADD CONSTRAINT "investment_foreign_taxes_paid_fiscal_event_id_fkey"
FOREIGN KEY ("fiscal_event_id") REFERENCES "investment_fiscal_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
