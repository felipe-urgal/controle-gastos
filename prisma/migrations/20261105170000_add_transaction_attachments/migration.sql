-- Comprovantes de lançamento guardados no próprio banco (sem armazenamento externo).
-- Limites e tipo de arquivo são validados na aplicação.

-- CreateTable
CREATE TABLE "transaction_attachments" (
  "id" TEXT NOT NULL,
  "filename" VARCHAR(120) NOT NULL,
  "mime_type" VARCHAR(60) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "userId" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "transaction_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "transaction_attachments_size_check" CHECK ("size_bytes" > 0 AND "size_bytes" <= 2097152)
);

-- CreateIndex
CREATE INDEX "transaction_attachments_transaction_id_idx" ON "transaction_attachments"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_attachments_userId_idx" ON "transaction_attachments"("userId");

-- AddForeignKey
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
