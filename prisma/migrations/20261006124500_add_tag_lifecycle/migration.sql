ALTER TABLE "tags"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "tags_userId_is_active_name_idx"
ON "tags"("userId", "is_active", "name");
