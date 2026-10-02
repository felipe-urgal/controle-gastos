CREATE TABLE "investment_fiscal_cost_adjustments" (
  "id" TEXT NOT NULL,
  "quantity_units" BIGINT NOT NULL,
  "cost_basis_cents" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "day" INTEGER NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "source_institution" VARCHAR(120),
  "userId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_fiscal_cost_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "investment_fiscal_cost_adjustments_quantity_positive_check"
    CHECK ("quantity_units" > 0),
  CONSTRAINT "investment_fiscal_cost_adjustments_cost_non_negative_check"
    CHECK ("cost_basis_cents" >= 0)
);

CREATE INDEX "investment_fiscal_cost_adjustments_userId_year_month_day_idx"
ON "investment_fiscal_cost_adjustments"("userId", "year", "month", "day");

CREATE INDEX "investment_fiscal_cost_adjustments_userId_assetId_year_month_day_idx"
ON "investment_fiscal_cost_adjustments"("userId", "assetId", "year", "month", "day");

ALTER TABLE "investment_fiscal_cost_adjustments"
ADD CONSTRAINT "investment_fiscal_cost_adjustments_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_fiscal_cost_adjustments"
ADD CONSTRAINT "investment_fiscal_cost_adjustments_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "investment_assets"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
