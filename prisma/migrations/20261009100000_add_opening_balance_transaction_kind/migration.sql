-- Saldo inicial de conta: lançamento de abertura, criado junto com a conta.
-- Entra no saldo (derivado de transações concluídas), mas não é receita nem despesa
-- (os agregados de fluxo filtram kind = 'NORMAL').
ALTER TYPE "TransactionKind" ADD VALUE IF NOT EXISTS 'OPENING_BALANCE';

ALTER TABLE "transactions"
DROP CONSTRAINT "transactions_kind_shape_check";

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_kind_shape_check"
CHECK (
  (
    "kind"::text = 'NORMAL'
    AND "categoryId" IS NOT NULL
    AND "transfer_id" IS NULL
    AND "transfer_role" IS NULL
  )
  OR
  (
    "kind"::text = 'TRANSFER'
    AND "categoryId" IS NULL
    AND "transfer_id" IS NOT NULL
    AND "transfer_role" IS NOT NULL
  )
  OR
  (
    "kind"::text = 'CARD_PAYMENT'
    AND "type" = 'EXPENSE'
    AND "categoryId" IS NULL
    AND "transfer_id" IS NULL
    AND "transfer_role" IS NULL
  )
  OR
  (
    "kind"::text = 'OPENING_BALANCE'
    AND "status" = 'COMPLETED'
    AND "categoryId" IS NULL
    AND "transfer_id" IS NULL
    AND "transfer_role" IS NULL
  )
);
