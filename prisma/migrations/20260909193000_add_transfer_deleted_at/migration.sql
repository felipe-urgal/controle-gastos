-- Keep the Transfer parent after logical deletion so the idempotency key
-- remains reserved and delayed POST retries cannot recreate the operation.
ALTER TABLE "transfers"
ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "transfers_user_id_deleted_at_idx"
ON "transfers"("user_id", "deleted_at");
