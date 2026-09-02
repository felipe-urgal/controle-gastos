ALTER TABLE "category_monthly_limits"
ADD COLUMN "currency" CHAR(3) NOT NULL DEFAULT 'BRL';

ALTER TABLE "category_monthly_limits"
ADD CONSTRAINT "category_monthly_limits_currency_check"
CHECK ("currency" IN ('BRL', 'USD', 'EUR'));

DROP INDEX "category_monthly_limits_userId_categoryId_year_month_key";
DROP INDEX "category_monthly_limits_userId_year_month_idx";
DROP INDEX "category_monthly_limits_categoryId_year_month_idx";

CREATE UNIQUE INDEX "category_monthly_limits_userId_categoryId_year_month_currency_key"
ON "category_monthly_limits"("userId", "categoryId", "year", "month", "currency");

CREATE INDEX "category_monthly_limits_userId_year_month_currency_idx"
ON "category_monthly_limits"("userId", "year", "month", "currency");

CREATE INDEX "category_monthly_limits_categoryId_year_month_currency_idx"
ON "category_monthly_limits"("categoryId", "year", "month", "currency");
