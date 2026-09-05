-- Runs after flexible recurrence persistence by timestamp; the domains are independent.
-- CreateEnum
CREATE TYPE "ImportRuleDescriptionOperator" AS ENUM ('EQUALS', 'STARTS_WITH', 'CONTAINS');

-- CreateTable
CREATE TABLE "transaction_import_rules" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "transactionType" "CategoryType" NOT NULL,
    "descriptionOperator" "ImportRuleDescriptionOperator" NOT NULL,
    "descriptionPattern" VARCHAR(255) NOT NULL,
    "minAmountCents" INTEGER,
    "maxAmountCents" INTEGER,
    "normalizedDescription" VARCHAR(255),
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "categoryId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_import_rules_pkey" PRIMARY KEY ("id")
);

-- Financial bounds are integers in the smallest currency unit.
ALTER TABLE "transaction_import_rules"
ADD CONSTRAINT "transaction_import_rules_amount_bounds_check"
CHECK (
  ("minAmountCents" IS NULL OR "minAmountCents" >= 0) AND
  ("maxAmountCents" IS NULL OR "maxAmountCents" >= 0) AND
  ("minAmountCents" IS NULL OR "maxAmountCents" IS NULL OR "minAmountCents" <= "maxAmountCents")
);

-- Indexes
CREATE INDEX "transaction_import_rules_userId_isActive_priority_id_idx"
ON "transaction_import_rules"("userId", "isActive", "priority", "id");

CREATE INDEX "transaction_import_rules_userId_accountId_idx"
ON "transaction_import_rules"("userId", "accountId");

CREATE INDEX "transaction_import_rules_userId_categoryId_idx"
ON "transaction_import_rules"("userId", "categoryId");

-- ForeignKeys
ALTER TABLE "transaction_import_rules"
ADD CONSTRAINT "transaction_import_rules_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_import_rules"
ADD CONSTRAINT "transaction_import_rules_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_import_rules"
ADD CONSTRAINT "transaction_import_rules_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
