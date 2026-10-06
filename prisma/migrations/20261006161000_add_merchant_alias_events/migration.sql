CREATE TABLE "merchant_alias_events" (
  "id" TEXT NOT NULL,
  "action" VARCHAR(20) NOT NULL,
  "alias_id" TEXT,
  "source_merchant_id" TEXT,
  "target_merchant_id" TEXT NOT NULL,
  "operator" "ImportRuleDescriptionOperator" NOT NULL,
  "pattern" VARCHAR(120) NOT NULL,
  "normalized_pattern" VARCHAR(120) NOT NULL,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "merchant_alias_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "merchant_alias_events"
ADD CONSTRAINT "merchant_alias_events_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "merchant_alias_events_user_created_idx"
ON "merchant_alias_events"("userId", "created_at");

CREATE INDEX "merchant_alias_events_user_alias_idx"
ON "merchant_alias_events"("userId", "alias_id");
