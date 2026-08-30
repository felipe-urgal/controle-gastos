CREATE TYPE "TransactionSeriesType" AS ENUM ('RECURRING', 'INSTALLMENT');

ALTER TABLE "transaction_series"
ADD COLUMN "type" "TransactionSeriesType" NOT NULL DEFAULT 'RECURRING',
ADD COLUMN "description" VARCHAR(100);

ALTER TABLE "transactions"
ADD COLUMN "series_index" INTEGER;

CREATE UNIQUE INDEX "transactions_seriesId_series_index_key"
ON "transactions"("seriesId", "series_index");

CREATE INDEX "transaction_series_userId_type_idx"
ON "transaction_series"("userId", "type");
