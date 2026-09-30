CREATE TABLE "transaction_create_operations" (
    "id" TEXT NOT NULL,
    "idempotency_key_hash" CHAR(64) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_create_operations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transaction_create_operations_transaction_id_key"
ON "transaction_create_operations"("transaction_id");

CREATE UNIQUE INDEX "transaction_create_operations_userId_idempotency_key_hash_key"
ON "transaction_create_operations"("userId", "idempotency_key_hash");

CREATE INDEX "transaction_create_operations_userId_created_at_idx"
ON "transaction_create_operations"("userId", "created_at");

ALTER TABLE "transaction_create_operations"
ADD CONSTRAINT "transaction_create_operations_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_create_operations"
ADD CONSTRAINT "transaction_create_operations_transaction_id_fkey"
FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
