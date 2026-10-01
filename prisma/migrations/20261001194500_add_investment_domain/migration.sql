-- CreateEnum
CREATE TYPE "InvestmentAssetType" AS ENUM ('STOCK', 'FII', 'ETF', 'FIXED_INCOME', 'CRYPTO', 'FUND', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentOperationType" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "investment_assets" (
    "id" TEXT NOT NULL,
    "symbol" VARCHAR(24) NOT NULL,
    "name" VARCHAR(120),
    "type" "InvestmentAssetType" NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
    "market" VARCHAR(40),
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_operations" (
    "id" TEXT NOT NULL,
    "type" "InvestmentOperationType" NOT NULL,
    "quantity_units" BIGINT NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "fees_cents" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "note" VARCHAR(500),
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_operations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "investment_operations_quantity_positive" CHECK ("quantity_units" > 0),
    CONSTRAINT "investment_operations_price_positive" CHECK ("unit_price_cents" > 0),
    CONSTRAINT "investment_operations_fees_nonnegative" CHECK ("fees_cents" >= 0),
    CONSTRAINT "investment_operations_month_valid" CHECK ("month" BETWEEN 1 AND 12),
    CONSTRAINT "investment_operations_day_valid" CHECK ("day" BETWEEN 1 AND 31)
);

-- CreateIndex
CREATE UNIQUE INDEX "investment_assets_userId_symbol_currency_key"
ON "investment_assets"("userId", "symbol", "currency");

-- CreateIndex
CREATE INDEX "investment_assets_userId_type_currency_idx"
ON "investment_assets"("userId", "type", "currency");

-- CreateIndex
CREATE INDEX "investment_operations_userId_year_month_day_idx"
ON "investment_operations"("userId", "year", "month", "day");

-- CreateIndex
CREATE INDEX "investment_operations_userId_accountId_year_month_day_idx"
ON "investment_operations"("userId", "accountId", "year", "month", "day");

-- CreateIndex
CREATE INDEX "investment_operations_userId_assetId_year_month_day_idx"
ON "investment_operations"("userId", "assetId", "year", "month", "day");

-- AddForeignKey
ALTER TABLE "investment_assets"
ADD CONSTRAINT "investment_assets_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_operations"
ADD CONSTRAINT "investment_operations_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_operations"
ADD CONSTRAINT "investment_operations_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_operations"
ADD CONSTRAINT "investment_operations_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "investment_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
