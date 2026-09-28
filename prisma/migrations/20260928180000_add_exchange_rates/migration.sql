-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('MANUAL');

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "from_currency" CHAR(3) NOT NULL,
    "to_currency" CHAR(3) NOT NULL,
    "numerator" INTEGER NOT NULL,
    "denominator" INTEGER NOT NULL,
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'MANUAL',
    "reference_year" INTEGER NOT NULL,
    "reference_month" INTEGER NOT NULL,
    "reference_day" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_userId_from_currency_to_currency_source_reference_year_reference_month_reference_day_key"
ON "exchange_rates"("userId", "from_currency", "to_currency", "source", "reference_year", "reference_month", "reference_day");

-- CreateIndex
CREATE INDEX "exchange_rates_userId_from_currency_to_currency_reference_year_reference_month_reference_day_idx"
ON "exchange_rates"("userId", "from_currency", "to_currency", "reference_year", "reference_month", "reference_day");

-- AddForeignKey
ALTER TABLE "exchange_rates"
ADD CONSTRAINT "exchange_rates_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
