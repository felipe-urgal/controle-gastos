-- Account balances are derived from COMPLETED transactions.
-- Keeping a persisted balance creates a second source of truth and allows drift.
ALTER TABLE "accounts" DROP COLUMN "balance";
