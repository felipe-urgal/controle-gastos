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

-- Defesa de integridade contra TOCTOU: depois de RECONCILED, nenhum update/delete comum
-- pode alterar o lançamento enquanto o estado continuar fechado. Um futuro fluxo explícito
-- de desfazer reconciliação pode primeiro trocar o estado e limpar reconciled_at; a CHECK
-- acima continua validando a transição.
CREATE FUNCTION "guard_reconciled_transaction_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."reconciliation_status" = 'RECONCILED' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'reconciled transaction cannot be deleted';
    END IF;

    IF NEW."reconciliation_status" = 'RECONCILED' THEN
      RAISE EXCEPTION 'reconciled transaction must be reopened before update';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "transactions_reconciled_mutation_guard"
BEFORE UPDATE OR DELETE ON "transactions"
FOR EACH ROW
EXECUTE FUNCTION "guard_reconciled_transaction_mutation"();
