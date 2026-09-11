-- CreateEnum
CREATE TYPE "ReconciliationAuditAction" AS ENUM ('CONFIRMED', 'UNDONE');

-- CreateTable
CREATE TABLE "account_reconciliation_events" (
    "id" TEXT NOT NULL,
    "action" "ReconciliationAuditAction" NOT NULL,
    "batch_reconciled_at" TIMESTAMP(3) NOT NULL,
    "transaction_count" INTEGER NOT NULL,
    "cutoff_year" INTEGER,
    "cutoff_month" INTEGER,
    "cutoff_day" INTEGER,
    "statement_balance" INTEGER,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_reconciliation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_reconciliation_events_account_id_batch_reconciled_at_action_key"
ON "account_reconciliation_events"("account_id", "batch_reconciled_at", "action");

-- CreateIndex
CREATE INDEX "account_reconciliation_events_user_id_account_id_created_at_idx"
ON "account_reconciliation_events"("user_id", "account_id", "created_at");

-- AddForeignKey
ALTER TABLE "account_reconciliation_events"
ADD CONSTRAINT "account_reconciliation_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_reconciliation_events"
ADD CONSTRAINT "account_reconciliation_events_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
