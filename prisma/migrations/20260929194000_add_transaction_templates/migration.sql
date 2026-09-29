CREATE TABLE "transaction_templates" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "type" "TransactionType" NOT NULL,
  "description" VARCHAR(255) NOT NULL DEFAULT '',
  "amount" INTEGER,
  "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
  "is_favorite" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "userId" TEXT NOT NULL,
  "accountId" TEXT,
  "categoryId" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transaction_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "transaction_templates_userId_name_key" ON "transaction_templates"("userId", "name");
CREATE INDEX "transaction_templates_userId_is_favorite_position_idx" ON "transaction_templates"("userId", "is_favorite", "position");
CREATE INDEX "transaction_templates_userId_type_idx" ON "transaction_templates"("userId", "type");
ALTER TABLE "transaction_templates" ADD CONSTRAINT "transaction_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction_templates" ADD CONSTRAINT "transaction_templates_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transaction_templates" ADD CONSTRAINT "transaction_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
