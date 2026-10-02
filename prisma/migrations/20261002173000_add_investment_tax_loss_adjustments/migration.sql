CREATE TABLE "investment_tax_loss_adjustments" (
  "id" TEXT NOT NULL,
  "asset_type" "InvestmentAssetType" NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_tax_loss_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "investment_tax_loss_adjustments_amount_non_negative_check"
    CHECK ("amount_cents" >= 0),
  CONSTRAINT "investment_tax_loss_adjustments_month_check"
    CHECK ("month" BETWEEN 1 AND 12)
);

CREATE INDEX "investment_tax_loss_adjustments_userId_year_month_idx"
ON "investment_tax_loss_adjustments"("userId", "year", "month");

CREATE INDEX "investment_tax_loss_adjustments_userId_asset_type_currency_year_month_idx"
ON "investment_tax_loss_adjustments"("userId", "asset_type", "currency", "year", "month");

ALTER TABLE "investment_tax_loss_adjustments"
ADD CONSTRAINT "investment_tax_loss_adjustments_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
