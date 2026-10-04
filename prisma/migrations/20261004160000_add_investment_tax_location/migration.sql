CREATE TYPE "InvestmentTaxLocation" AS ENUM ('BRAZIL', 'ABROAD');

ALTER TABLE "investment_assets"
ADD COLUMN "tax_location" "InvestmentTaxLocation" NOT NULL DEFAULT 'BRAZIL';

UPDATE "investment_assets"
SET "tax_location" = 'ABROAD'
WHERE "currency" IN ('USD', 'EUR');

CREATE INDEX "investment_assets_userId_tax_location_idx"
ON "investment_assets"("userId", "tax_location");
