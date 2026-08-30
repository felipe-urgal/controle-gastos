-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('MONTHLY');

-- CreateTable
CREATE TABLE "transaction_series" (
    "id" TEXT NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL DEFAULT 'MONTHLY',
    "anchorDay" INTEGER NOT NULL,
    "startYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "startDay" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "endMonth" INTEGER NOT NULL,
    "endDay" INTEGER NOT NULL,
    "occurrenceCount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "transaction_series_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "transaction_series_userId_idx" ON "transaction_series"("userId");

-- CreateIndex
CREATE INDEX "transactions_seriesId_idx" ON "transactions"("seriesId");

-- AddForeignKey
ALTER TABLE "transaction_series" ADD CONSTRAINT "transaction_series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "transaction_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
