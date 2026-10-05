-- A conta não pode apagar histórico financeiro por cascade.
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_accountId_fkey";

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
