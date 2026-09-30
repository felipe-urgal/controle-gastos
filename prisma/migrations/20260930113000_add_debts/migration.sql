CREATE TYPE "DebtStatus" AS ENUM ('ACTIVE', 'PAID', 'ARCHIVED');

CREATE TABLE "debts" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
  "balance" INTEGER NOT NULL,
  "installment_amount" INTEGER,
  "due_year" INTEGER,
  "due_month" INTEGER,
  "due_day" INTEGER,
  "remaining_installments" INTEGER,
  "institution" VARCHAR(120),
  "description" VARCHAR(500),
  "status" "DebtStatus" NOT NULL DEFAULT 'ACTIVE',
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "debt_adjustments" (
  "id" TEXT NOT NULL,
  "previous_balance" INTEGER NOT NULL,
  "new_balance" INTEGER NOT NULL,
  "delta" INTEGER NOT NULL,
  "description" VARCHAR(255),
  "userId" TEXT NOT NULL,
  "debt_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "debt_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "debts_userId_status_idx" ON "debts"("userId", "status");
CREATE INDEX "debts_userId_currency_status_idx" ON "debts"("userId", "currency", "status");
CREATE INDEX "debt_adjustments_userId_debt_id_created_at_idx" ON "debt_adjustments"("userId", "debt_id", "created_at");
CREATE INDEX "debt_adjustments_debt_id_created_at_idx" ON "debt_adjustments"("debt_id", "created_at");

ALTER TABLE "debts"
  ADD CONSTRAINT "debts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "debt_adjustments"
  ADD CONSTRAINT "debt_adjustments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "debt_adjustments"
  ADD CONSTRAINT "debt_adjustments_debt_id_fkey"
  FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
