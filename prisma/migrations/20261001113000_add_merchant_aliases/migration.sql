CREATE TABLE "merchant_aliases" (
  "id" TEXT NOT NULL,
  "pattern" VARCHAR(120) NOT NULL,
  "normalized_pattern" VARCHAR(120) NOT NULL,
  "operator" "ImportRuleDescriptionOperator" NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "userId" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "merchant_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_aliases_user_merchant_operator_pattern_key"
  ON "merchant_aliases"("userId", "merchant_id", "operator", "normalized_pattern");

CREATE INDEX "merchant_aliases_user_priority_id_idx"
  ON "merchant_aliases"("userId", "priority", "id");

CREATE INDEX "merchant_aliases_merchant_priority_id_idx"
  ON "merchant_aliases"("merchant_id", "priority", "id");

ALTER TABLE "merchant_aliases"
  ADD CONSTRAINT "merchant_aliases_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "merchant_aliases"
  ADD CONSTRAINT "merchant_aliases_merchant_id_fkey"
  FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
