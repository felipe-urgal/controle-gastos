/*
  Warnings:

  - You are about to drop the `financial_goals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `import_jobs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `investments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "financial_goals" DROP CONSTRAINT "financial_goals_userId_fkey";

-- DropForeignKey
ALTER TABLE "import_jobs" DROP CONSTRAINT "import_jobs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "investments" DROP CONSTRAINT "investments_accountId_fkey";

-- DropForeignKey
ALTER TABLE "investments" DROP CONSTRAINT "investments_userId_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_accountId_fkey";

-- DropIndex
DROP INDEX "accounts_created_at_idx";

-- DropIndex
DROP INDEX "accounts_currency_type_idx";

-- DropIndex
DROP INDEX "accounts_type_isActive_idx";

-- DropIndex
DROP INDEX "accounts_userId_balance_idx";

-- DropIndex
DROP INDEX "categories_created_at_idx";

-- DropIndex
DROP INDEX "categories_userId_isActive_idx";

-- DropIndex
DROP INDEX "categories_userId_type_idx";

-- DropIndex
DROP INDEX "password_reset_tokens_token_idx";

-- DropIndex
DROP INDEX "transactions_accountId_idx";

-- DropIndex
DROP INDEX "transactions_categoryId_idx";

-- DropIndex
DROP INDEX "transactions_userId_categoryId_year_month_day_idx";

-- DropIndex
DROP INDEX "transactions_userId_idx";

-- DropIndex
DROP INDEX "transactions_userId_type_idx";

-- DropIndex
DROP INDEX "transactions_userId_type_year_month_idx";

-- DropIndex
DROP INDEX "transactions_userId_year_idx";

-- DropIndex
DROP INDEX "transactions_userId_year_month_type_idx";

-- DropIndex
DROP INDEX "users_created_at_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- DropIndex
DROP INDEX "users_isActive_idx";

-- DropTable
DROP TABLE "financial_goals";

-- DropTable
DROP TABLE "import_jobs";

-- DropTable
DROP TABLE "investments";

-- DropEnum
DROP TYPE "GoalType";

-- DropEnum
DROP TYPE "InvestmentType";

-- DropEnum
DROP TYPE "JobStatus";

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
