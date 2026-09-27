-- Add credit-card account type.
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'CREDIT_CARD';

-- Credit-card configuration remains on Account because it belongs to the
-- payment instrument, while statements can be derived from transactions.
ALTER TABLE "accounts"
ADD COLUMN "credit_limit" INTEGER,
ADD COLUMN "statement_closing_day" INTEGER,
ADD COLUMN "statement_due_day" INTEGER;

ALTER TABLE "accounts"
ADD CONSTRAINT "accounts_credit_card_configuration_check"
CHECK (
  (
    "type"::text = 'CREDIT_CARD'
    AND "credit_limit" IS NOT NULL
    AND "credit_limit" > 0
    AND "statement_closing_day" BETWEEN 1 AND 31
    AND "statement_due_day" BETWEEN 1 AND 31
  )
  OR
  (
    "type"::text <> 'CREDIT_CARD'
    AND "credit_limit" IS NULL
    AND "statement_closing_day" IS NULL
    AND "statement_due_day" IS NULL
  )
);
