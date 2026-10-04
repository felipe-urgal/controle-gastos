CREATE TYPE "ExchangeRateQuoteSide" AS ENUM ('GENERIC', 'BUY', 'SELL');

ALTER TABLE "exchange_rates"
ADD COLUMN "quote_side" "ExchangeRateQuoteSide" NOT NULL DEFAULT 'GENERIC';

UPDATE "exchange_rates"
SET "quote_side" = 'SELL'
WHERE "source" = 'BCB_PTAX';

DROP INDEX "exchange_rates_userId_from_currency_to_currency_source_reference_year_reference_month_reference_day_key";

CREATE UNIQUE INDEX "exchange_rates_userId_from_currency_to_currency_source_quote_side_reference_year_reference_month_reference_day_key"
ON "exchange_rates"(
  "userId",
  "from_currency",
  "to_currency",
  "source",
  "quote_side",
  "reference_year",
  "reference_month",
  "reference_day"
);
