/*
  Warnings:

  - The values [CHECKING,SAVINGS,CREDIT,OTHER] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.
  - The values [TRANSFER] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `balance` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Integer`.
  - You are about to drop the column `transaction_date` on the `transactions` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Integer`.
  - A unique constraint covering the columns `[name,userId]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `status` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('CREDIT_DEBIT', 'INVESTMENT');
ALTER TABLE "accounts" ALTER COLUMN "type" TYPE "AccountType_new" USING ("type"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "AccountType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('INCOME', 'EXPENSE');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;

-- DropIndex
DROP INDEX "transactions_accountId_transaction_date_idx";

-- DropIndex
DROP INDEX "transactions_userId_categoryId_transaction_date_idx";

-- DropIndex
DROP INDEX "transactions_userId_type_transaction_date_idx";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "color" CHAR(7),
ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "icon" VARCHAR(30),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "balance" SET DEFAULT 0,
ALTER COLUMN "balance" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "color" CHAR(7) NOT NULL DEFAULT '#3B82F6',
ADD COLUMN     "description" VARCHAR(200),
ADD COLUMN     "icon" VARCHAR(30) NOT NULL DEFAULT 'tag',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'EXPENSE';

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "transaction_date",
ADD COLUMN     "status" "TransactionStatus" NOT NULL,
ALTER COLUMN "amount" SET DEFAULT 0,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- CreateIndex
CREATE INDEX "accounts_userId_isActive_idx" ON "accounts"("userId", "isActive");

-- CreateIndex
CREATE INDEX "accounts_currency_type_idx" ON "accounts"("currency", "type");

-- CreateIndex
CREATE INDEX "accounts_created_at_idx" ON "accounts"("created_at");

-- CreateIndex
CREATE INDEX "accounts_userId_currency_isActive_idx" ON "accounts"("userId", "currency", "isActive");

-- CreateIndex
CREATE INDEX "accounts_type_isActive_idx" ON "accounts"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_name_userId_key" ON "accounts"("name", "userId");

-- CreateIndex
CREATE INDEX "categories_userId_isActive_idx" ON "categories"("userId", "isActive");

-- CreateIndex
CREATE INDEX "categories_userId_type_idx" ON "categories"("userId", "type");

-- CreateIndex
CREATE INDEX "categories_userId_position_idx" ON "categories"("userId", "position");

-- CreateIndex
CREATE INDEX "categories_userId_type_isActive_idx" ON "categories"("userId", "type", "isActive");

-- CreateIndex
CREATE INDEX "categories_created_at_idx" ON "categories"("created_at");

-- CreateIndex
CREATE INDEX "transactions_userId_type_idx" ON "transactions"("userId", "type");

-- CreateIndex
CREATE INDEX "transactions_accountId_year_month_idx" ON "transactions"("accountId", "year", "month");

-- CreateIndex
CREATE INDEX "transactions_userId_categoryId_year_month_day_idx" ON "transactions"("userId", "categoryId", "year", "month", "day");

-- CreateIndex
CREATE INDEX "transactions_userId_type_year_month_idx" ON "transactions"("userId", "type", "year", "month");

-- CreateIndex
CREATE INDEX "transactions_userId_year_month_day_idx" ON "transactions"("userId", "year", "month", "day");

-- CreateIndex
CREATE INDEX "transactions_accountId_type_year_month_idx" ON "transactions"("accountId", "type", "year", "month");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_last_login_idx" ON "users"("last_login");

-- CreateIndex
CREATE INDEX "users_created_at_isActive_idx" ON "users"("created_at", "isActive");
