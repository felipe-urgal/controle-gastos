-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('UNCLEARED', 'CLEARED', 'RECONCILED');

-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN "reconciliation_status" "ReconciliationStatus" NOT NULL DEFAULT 'UNCLEARED',
ADD COLUMN "reconciled_at" TIMESTAMP(3);

-- A transação continua usando status financeiro como fonte do realizado.
-- Reconciliação é uma dimensão ortogonal e só pode avançar quando o item já é COMPLETED.
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_reconciliation_state_check"
CHECK (
  ("reconciliation_status" = 'UNCLEARED' AND "reconciled_at" IS NULL)
  OR (
    "reconciliation_status" = 'CLEARED'
    AND "status" = 'COMPLETED'
    AND "reconciled_at" IS NULL
  )
  OR (
    "reconciliation_status" = 'RECONCILED'
    AND "status" = 'COMPLETED'
    AND "reconciled_at" IS NOT NULL
  )
);

CREATE INDEX "transactions_user_account_reconciliation_date_idx"
ON "transactions"("userId", "accountId", "reconciliation_status", "year", "month");
