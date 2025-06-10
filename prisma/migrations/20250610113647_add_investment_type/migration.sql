-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('BUY', 'SELL');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "investmentType" "InvestmentType";
