-- CreateEnum
CREATE TYPE "FinancialGoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FinancialGoalEntryType" AS ENUM ('CONTRIBUTION', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "financial_goals" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "target_amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
    "target_year" INTEGER,
    "target_month" INTEGER,
    "target_day" INTEGER,
    "status" "FinancialGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" VARCHAR(500),
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_goal_entries" (
    "id" TEXT NOT NULL,
    "type" "FinancialGoalEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" VARCHAR(255),
    "userId" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_goal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_goals_userId_status_created_at_idx"
ON "financial_goals"("userId", "status", "created_at");

-- CreateIndex
CREATE INDEX "financial_goals_userId_currency_status_idx"
ON "financial_goals"("userId", "currency", "status");

-- CreateIndex
CREATE INDEX "financial_goals_userId_accountId_idx"
ON "financial_goals"("userId", "accountId");

-- CreateIndex
CREATE INDEX "financial_goal_entries_userId_goal_id_created_at_idx"
ON "financial_goal_entries"("userId", "goal_id", "created_at");

-- AddForeignKey
ALTER TABLE "financial_goals"
ADD CONSTRAINT "financial_goals_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_goals"
ADD CONSTRAINT "financial_goals_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_goal_entries"
ADD CONSTRAINT "financial_goal_entries_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_goal_entries"
ADD CONSTRAINT "financial_goal_entries_goal_id_fkey"
FOREIGN KEY ("goal_id") REFERENCES "financial_goals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
