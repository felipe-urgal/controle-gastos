CREATE TYPE "TransactionImportSource" AS ENUM ('CSV', 'OFX');

ALTER TABLE "transactions"
ADD COLUMN "import_source" "TransactionImportSource",
ADD COLUMN "import_fingerprint" CHAR(64),
ADD COLUMN "import_external_id" VARCHAR(191);

CREATE INDEX "transactions_userId_import_source_idx"
ON "transactions"("userId", "import_source");

CREATE UNIQUE INDEX "transactions_userId_import_fingerprint_key"
ON "transactions"("userId", "import_fingerprint");
