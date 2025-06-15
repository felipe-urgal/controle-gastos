-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvestmentType" ADD VALUE 'DIVIDEND';
ALTER TYPE "InvestmentType" ADD VALUE 'INTEREST';
ALTER TYPE "InvestmentType" ADD VALUE 'SPLIT';
ALTER TYPE "InvestmentType" ADD VALUE 'MERGER';

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "transaction_date" DROP NOT NULL,
ALTER COLUMN "transaction_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(12,4) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "InvestmentType" NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "investment_date" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" VARCHAR(10) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investments_userId_idx" ON "investments"("userId");

-- CreateIndex
CREATE INDEX "investments_accountId_idx" ON "investments"("accountId");

-- CreateIndex
CREATE INDEX "investments_userId_type_investment_date_idx" ON "investments"("userId", "type", "investment_date");

-- CreateIndex
CREATE INDEX "investments_userId_ticker_idx" ON "investments"("userId", "ticker");

-- CreateIndex
CREATE INDEX "investments_accountId_investment_date_idx" ON "investments"("accountId", "investment_date");

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
