ALTER TABLE "investment_tax_payments"
ADD COLUMN "transaction_id" TEXT;

CREATE UNIQUE INDEX "investment_tax_payments_transaction_id_key"
ON "investment_tax_payments"("transaction_id");

ALTER TABLE "investment_tax_payments"
ADD CONSTRAINT "investment_tax_payments_transaction_id_fkey"
FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
