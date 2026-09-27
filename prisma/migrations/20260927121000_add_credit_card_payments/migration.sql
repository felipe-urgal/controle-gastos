-- Add dedicated transaction kind for credit-card statement payments.
ALTER TYPE "TransactionKind" ADD VALUE IF NOT EXISTS 'CARD_PAYMENT';

-- Replace the transaction-shape constraint to allow a cash outflow that is
-- intentionally not categorized as a second expense.
ALTER TABLE "transactions"
DROP CONSTRAINT "transactions_kind_shape_check";

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_kind_shape_check"
CHECK (
  (
    "kind"::text = 'NORMAL'
    AND "categoryId" IS NOT NULL
    AND "transfer_id" IS NULL
    AND "transfer_role" IS NULL
  )
  OR
  (
    "kind"::text = 'TRANSFER'
    AND "categoryId" IS NULL
    AND "transfer_id" IS NOT NULL
    AND "transfer_role" IS NOT NULL
  )
  OR
  (
    "kind"::text = 'CARD_PAYMENT'
    AND "type" = 'EXPENSE'
    AND "categoryId" IS NULL
    AND "transfer_id" IS NULL
    AND "transfer_role" IS NULL
  )
);

CREATE TABLE "credit_card_payments" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "closing_year" INTEGER NOT NULL,
    "closing_month" INTEGER NOT NULL,
    "closing_day" INTEGER NOT NULL,
    "idempotency_key_hash" CHAR(64) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "card_account_id" TEXT NOT NULL,
    "source_account_id" TEXT NOT NULL,
    "source_transaction_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_card_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "credit_card_payments_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "credit_card_payments_closing_date_check" CHECK (
      "closing_year" BETWEEN 2000 AND 2100
      AND "closing_month" BETWEEN 1 AND 12
      AND "closing_day" BETWEEN 1 AND 31
    )
);

CREATE UNIQUE INDEX "credit_card_payments_source_transaction_id_key"
ON "credit_card_payments"("source_transaction_id");

CREATE UNIQUE INDEX "credit_card_payments_userId_idempotency_key_hash_key"
ON "credit_card_payments"("userId", "idempotency_key_hash");

CREATE UNIQUE INDEX "credit_card_payments_statement_key"
ON "credit_card_payments"(
  "userId",
  "card_account_id",
  "closing_year",
  "closing_month",
  "closing_day"
);

CREATE INDEX "credit_card_payments_user_card_created_idx"
ON "credit_card_payments"("userId", "card_account_id", "created_at");

CREATE INDEX "credit_card_payments_user_source_idx"
ON "credit_card_payments"("userId", "source_account_id");

ALTER TABLE "credit_card_payments"
ADD CONSTRAINT "credit_card_payments_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_card_payments"
ADD CONSTRAINT "credit_card_payments_card_account_id_fkey"
FOREIGN KEY ("card_account_id") REFERENCES "accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "credit_card_payments"
ADD CONSTRAINT "credit_card_payments_source_account_id_fkey"
FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "credit_card_payments"
ADD CONSTRAINT "credit_card_payments_source_transaction_id_fkey"
FOREIGN KEY ("source_transaction_id") REFERENCES "transactions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
