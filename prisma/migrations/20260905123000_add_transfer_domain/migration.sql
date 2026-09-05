-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('NORMAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransferRole" AS ENUM ('SOURCE', 'DESTINATION');

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN "kind" "TransactionKind" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "transfer_id" TEXT,
ADD COLUMN "transfer_role" "TransferRole",
ALTER COLUMN "categoryId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "transfers_id_userId_key"
ON "transfers"("id", "userId");

-- CreateIndex
CREATE INDEX "transfers_userId_idx"
ON "transfers"("userId");

-- CreateIndex
CREATE INDEX "transactions_transfer_id_idx"
ON "transactions"("transfer_id");

-- CreateIndex
CREATE INDEX "transactions_userId_kind_year_month_idx"
ON "transactions"("userId", "kind", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transfer_id_transfer_role_key"
ON "transactions"("transfer_id", "transfer_role");

-- AddForeignKey
ALTER TABLE "transfers"
ADD CONSTRAINT "transfers_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_transfer_id_userId_fkey"
FOREIGN KEY ("transfer_id", "userId") REFERENCES "transfers"("id", "userId")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain checks: existing rows remain NORMAL and keep category ownership semantics.
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_kind_shape_check"
CHECK (
  (
    "kind" = 'NORMAL'
    AND "categoryId" IS NOT NULL
    AND "transfer_id" IS NULL
    AND "transfer_role" IS NULL
  )
  OR
  (
    "kind" = 'TRANSFER'
    AND "categoryId" IS NULL
    AND "transfer_id" IS NOT NULL
    AND "transfer_role" IS NOT NULL
  )
);

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_transfer_role_type_check"
CHECK (
  "kind" = 'NORMAL'
  OR ("transfer_role" = 'SOURCE' AND "type" = 'EXPENSE')
  OR ("transfer_role" = 'DESTINATION' AND "type" = 'INCOME')
);
