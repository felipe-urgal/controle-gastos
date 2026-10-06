CREATE TYPE "DebtAdjustmentKind" AS ENUM (
  'INITIAL_BALANCE',
  'MANUAL_ADJUSTMENT',
  'PAYMENT'
);

ALTER TABLE "debt_adjustments"
  ADD COLUMN "kind" "DebtAdjustmentKind" NOT NULL DEFAULT 'MANUAL_ADJUSTMENT',
  ADD COLUMN "effective_year" INTEGER,
  ADD COLUMN "effective_month" INTEGER,
  ADD COLUMN "effective_day" INTEGER,
  ADD COLUMN "idempotency_key_hash" CHAR(64),
  ADD COLUMN "request_hash" CHAR(64),
  ADD COLUMN "transaction_id" TEXT;

UPDATE "debt_adjustments"
SET "kind" = 'INITIAL_BALANCE'
WHERE "description" = 'Saldo inicial'
  AND "previous_balance" = 0;

ALTER TABLE "financial_goal_entries"
  ADD COLUMN "idempotency_key_hash" CHAR(64),
  ADD COLUMN "request_hash" CHAR(64);

CREATE UNIQUE INDEX "debt_adjustments_userId_idempotency_key_hash_key"
ON "debt_adjustments"("userId", "idempotency_key_hash");

CREATE UNIQUE INDEX "debt_adjustments_transaction_id_key"
ON "debt_adjustments"("transaction_id");

CREATE INDEX "debt_adjustments_userId_debt_id_effective_year_effective_month_effective_day_idx"
ON "debt_adjustments"(
  "userId",
  "debt_id",
  "effective_year",
  "effective_month",
  "effective_day"
);

CREATE UNIQUE INDEX "financial_goal_entries_userId_idempotency_key_hash_key"
ON "financial_goal_entries"("userId", "idempotency_key_hash");

ALTER TABLE "debt_adjustments"
  ADD CONSTRAINT "debt_adjustments_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
