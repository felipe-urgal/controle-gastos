CREATE TABLE "merchants" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transactions" ADD COLUMN "merchant_id" TEXT;

CREATE UNIQUE INDEX "merchants_userId_name_key" ON "merchants"("userId", "name");
CREATE UNIQUE INDEX "merchants_userId_name_ci_key" ON "merchants"("userId", LOWER("name"));
CREATE INDEX "merchants_userId_is_active_name_idx" ON "merchants"("userId", "is_active", "name");
CREATE INDEX "transactions_userId_merchant_id_year_month_idx" ON "transactions"("userId", "merchant_id", "year", "month");

ALTER TABLE "merchants"
  ADD CONSTRAINT "merchants_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
