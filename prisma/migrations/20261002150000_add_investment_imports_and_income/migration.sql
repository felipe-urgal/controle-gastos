CREATE TYPE "InvestmentIncomeType" AS ENUM ('INCOME', 'DIVIDEND', 'INTEREST', 'OTHER');

ALTER TABLE "investment_operations"
ADD COLUMN "import_source" "TransactionImportSource",
ADD COLUMN "import_fingerprint" CHAR(64);

CREATE UNIQUE INDEX "investment_operations_user_id_import_fingerprint_key"
ON "investment_operations"("userId", "import_fingerprint");

CREATE TABLE "investment_incomes" (
  "id" TEXT NOT NULL,
  "type" "InvestmentIncomeType" NOT NULL DEFAULT 'INCOME',
  "quantity_units" BIGINT NOT NULL,
  "unit_value_cents" INTEGER NOT NULL,
  "net_amount_cents" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "day" INTEGER NOT NULL,
  "note" VARCHAR(500),
  "import_source" "TransactionImportSource",
  "import_fingerprint" CHAR(64),
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_incomes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "investment_incomes_userId_year_month_day_idx"
ON "investment_incomes"("userId", "year", "month", "day");

CREATE INDEX "investment_incomes_userId_accountId_year_month_day_idx"
ON "investment_incomes"("userId", "accountId", "year", "month", "day");

CREATE INDEX "investment_incomes_userId_assetId_year_month_day_idx"
ON "investment_incomes"("userId", "assetId", "year", "month", "day");

CREATE UNIQUE INDEX "investment_incomes_userId_import_fingerprint_key"
ON "investment_incomes"("userId", "import_fingerprint");

ALTER TABLE "investment_incomes"
ADD CONSTRAINT "investment_incomes_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_incomes"
ADD CONSTRAINT "investment_incomes_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "investment_incomes"
ADD CONSTRAINT "investment_incomes_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "investment_assets"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
