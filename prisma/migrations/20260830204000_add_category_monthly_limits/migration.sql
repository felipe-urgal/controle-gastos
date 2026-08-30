CREATE TABLE "category_monthly_limits" (
  "id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "category_monthly_limits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "category_monthly_limits_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "category_monthly_limits_month_check" CHECK ("month" >= 1 AND "month" <= 12)
);

CREATE UNIQUE INDEX "category_monthly_limits_userId_categoryId_year_month_key"
ON "category_monthly_limits"("userId", "categoryId", "year", "month");

CREATE INDEX "category_monthly_limits_userId_year_month_idx"
ON "category_monthly_limits"("userId", "year", "month");

CREATE INDEX "category_monthly_limits_categoryId_year_month_idx"
ON "category_monthly_limits"("categoryId", "year", "month");

ALTER TABLE "category_monthly_limits"
ADD CONSTRAINT "category_monthly_limits_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "category_monthly_limits"
ADD CONSTRAINT "category_monthly_limits_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
