ALTER TABLE "transfers"
ADD COLUMN "idempotency_key_hash" CHAR(64),
ADD COLUMN "request_hash" CHAR(64);

CREATE UNIQUE INDEX "transfers_userId_idempotency_key_hash_key"
ON "transfers"("userId", "idempotency_key_hash");

ALTER TABLE "transfers"
ADD CONSTRAINT "transfers_idempotency_pair_check"
CHECK (
  ("idempotency_key_hash" IS NULL AND "request_hash" IS NULL)
  OR
  ("idempotency_key_hash" IS NOT NULL AND "request_hash" IS NOT NULL)
);
