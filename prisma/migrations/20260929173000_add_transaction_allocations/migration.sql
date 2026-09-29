CREATE TABLE "transaction_allocations" (
  "id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transaction_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transaction_allocations_transaction_id_categoryId_key" ON "transaction_allocations"("transaction_id", "categoryId");
CREATE INDEX "transaction_allocations_userId_categoryId_idx" ON "transaction_allocations"("userId", "categoryId");
CREATE INDEX "transaction_allocations_transaction_id_idx" ON "transaction_allocations"("transaction_id");

ALTER TABLE "transaction_allocations" ADD CONSTRAINT "transaction_allocations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "transaction_allocations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "transaction_allocations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
