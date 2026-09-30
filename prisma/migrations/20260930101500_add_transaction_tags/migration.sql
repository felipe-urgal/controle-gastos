CREATE TABLE "tags" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transaction_tags" (
  "userId" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "tag_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "transaction_tags_pkey" PRIMARY KEY ("transaction_id","tag_id")
);

CREATE UNIQUE INDEX "tags_userId_name_key" ON "tags"("userId", "name");
CREATE INDEX "tags_userId_name_idx" ON "tags"("userId", "name");
CREATE INDEX "transaction_tags_userId_tag_id_transaction_id_idx" ON "transaction_tags"("userId", "tag_id", "transaction_id");
CREATE INDEX "transaction_tags_tag_id_transaction_id_idx" ON "transaction_tags"("tag_id", "transaction_id");

ALTER TABLE "tags"
  ADD CONSTRAINT "tags_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_tags"
  ADD CONSTRAINT "transaction_tags_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_tags"
  ADD CONSTRAINT "transaction_tags_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_tags"
  ADD CONSTRAINT "transaction_tags_tag_id_fkey"
  FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
