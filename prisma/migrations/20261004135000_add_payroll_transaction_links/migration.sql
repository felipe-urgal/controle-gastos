CREATE TABLE "payroll_transaction_links" (
    "id" TEXT NOT NULL,
    "matched_amount_cents" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "payroll_document_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_transaction_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_transaction_links_payroll_document_id_key"
ON "payroll_transaction_links"("payroll_document_id");

CREATE UNIQUE INDEX "payroll_transaction_links_transaction_id_key"
ON "payroll_transaction_links"("transaction_id");

CREATE INDEX "payroll_transaction_links_userId_created_at_idx"
ON "payroll_transaction_links"("userId", "created_at");

ALTER TABLE "payroll_transaction_links"
ADD CONSTRAINT "payroll_transaction_links_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_transaction_links"
ADD CONSTRAINT "payroll_transaction_links_payroll_document_id_fkey"
FOREIGN KEY ("payroll_document_id") REFERENCES "payroll_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_transaction_links"
ADD CONSTRAINT "payroll_transaction_links_transaction_id_fkey"
FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
