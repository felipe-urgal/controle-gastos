-- ExtendEnum
ALTER TYPE "RecurrenceFrequency" ADD VALUE 'WEEKLY' BEFORE 'MONTHLY';
ALTER TYPE "RecurrenceFrequency" ADD VALUE 'YEARLY' AFTER 'MONTHLY';

-- AlterTable
ALTER TABLE "transaction_series"
ADD COLUMN "interval" INTEGER NOT NULL DEFAULT 1;

-- Keep the persisted shape aligned with the MVP contract.
ALTER TABLE "transaction_series"
ADD CONSTRAINT "transaction_series_frequency_interval_check"
CHECK (
  ("frequency" = 'WEEKLY' AND "interval" IN (1, 2)) OR
  ("frequency" = 'MONTHLY' AND "interval" IN (1, 3)) OR
  ("frequency" = 'YEARLY' AND "interval" = 1)
);
