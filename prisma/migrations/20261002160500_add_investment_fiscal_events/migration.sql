CREATE TYPE "InvestmentFiscalEventType" AS ENUM (
  'BUY',
  'SELL',
  'CUSTODY_TRANSFER_IN',
  'CUSTODY_TRANSFER_OUT',
  'BONUS',
  'SPLIT',
  'REVERSE_SPLIT',
  'OTHER'
);

CREATE TYPE "InvestmentFiscalClassificationSource" AS ENUM (
  'SYSTEM',
  'USER'
);

CREATE TABLE "investment_fiscal_events" (
  "id" TEXT NOT NULL,
  "type" "InvestmentFiscalEventType" NOT NULL,
  "original_type" "InvestmentFiscalEventType" NOT NULL,
  "classification_source" "InvestmentFiscalClassificationSource" NOT NULL DEFAULT 'SYSTEM',
  "quantity_units" BIGINT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "day" INTEGER NOT NULL,
  "source_institution" VARCHAR(120),
  "destination_institution" VARCHAR(120),
  "reclassification_note" VARCHAR(500),
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "operation_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_fiscal_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "investment_fiscal_events_quantity_positive_check" CHECK ("quantity_units" > 0)
);

CREATE UNIQUE INDEX "investment_fiscal_events_operation_id_key"
ON "investment_fiscal_events"("operation_id");

CREATE INDEX "investment_fiscal_events_userId_year_month_day_idx"
ON "investment_fiscal_events"("userId", "year", "month", "day");

CREATE INDEX "investment_fiscal_events_userId_accountId_year_month_day_idx"
ON "investment_fiscal_events"("userId", "accountId", "year", "month", "day");

CREATE INDEX "investment_fiscal_events_userId_assetId_year_month_day_idx"
ON "investment_fiscal_events"("userId", "assetId", "year", "month", "day");

ALTER TABLE "investment_fiscal_events"
ADD CONSTRAINT "investment_fiscal_events_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_fiscal_events"
ADD CONSTRAINT "investment_fiscal_events_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "investment_fiscal_events"
ADD CONSTRAINT "investment_fiscal_events_assetId_fkey"
FOREIGN KEY ("assetId") REFERENCES "investment_assets"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "investment_fiscal_events"
ADD CONSTRAINT "investment_fiscal_events_operation_id_fkey"
FOREIGN KEY ("operation_id") REFERENCES "investment_operations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "investment_fiscal_events" (
  "id",
  "type",
  "original_type",
  "classification_source",
  "quantity_units",
  "year",
  "month",
  "day",
  "userId",
  "accountId",
  "assetId",
  "operation_id",
  "created_at",
  "updated_at"
)
SELECT
  io.id,
  io.type::text::"InvestmentFiscalEventType",
  io.type::text::"InvestmentFiscalEventType",
  'SYSTEM'::"InvestmentFiscalClassificationSource",
  io."quantity_units",
  io.year,
  io.month,
  io.day,
  io."userId",
  io."accountId",
  io."assetId",
  io.id,
  io."created_at",
  io."updated_at"
FROM "investment_operations" io;
