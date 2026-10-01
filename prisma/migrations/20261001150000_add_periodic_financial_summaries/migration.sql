-- CreateEnum
CREATE TYPE "PeriodicSummaryFrequency" AS ENUM ('WEEKLY');

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "periodic_summary_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "periodic_summary_frequency" "PeriodicSummaryFrequency" NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN "periodic_summary_last_processed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "periodic_financial_summaries" (
  "id" TEXT NOT NULL,
  "frequency" "PeriodicSummaryFrequency" NOT NULL DEFAULT 'WEEKLY',
  "currency" CHAR(3) NOT NULL,
  "period_start_year" INTEGER NOT NULL,
  "period_start_month" INTEGER NOT NULL,
  "period_start_day" INTEGER NOT NULL,
  "period_end_year" INTEGER NOT NULL,
  "period_end_month" INTEGER NOT NULL,
  "period_end_day" INTEGER NOT NULL,
  "content" JSONB NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "periodic_financial_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "periodic_financial_summaries_unique_period"
ON "periodic_financial_summaries"(
  "userId",
  "frequency",
  "currency",
  "period_start_year",
  "period_start_month",
  "period_start_day"
);

-- CreateIndex
CREATE INDEX "periodic_financial_summaries_userId_currency_generated_at_idx"
ON "periodic_financial_summaries"("userId", "currency", "generated_at");

-- AddForeignKey
ALTER TABLE "periodic_financial_summaries"
ADD CONSTRAINT "periodic_financial_summaries_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
