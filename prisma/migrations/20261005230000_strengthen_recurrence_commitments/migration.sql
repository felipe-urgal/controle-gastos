-- Persist recurrence pattern decisions and lifecycle metadata.
CREATE TYPE "RecurrencePatternReviewStatus" AS ENUM ('CONFIRMED', 'SUPPRESSED');

ALTER TABLE "transaction_series"
ADD COLUMN "source_key" VARCHAR(96),
ADD COLUMN "ended_at" TIMESTAMP(3);

CREATE TABLE "recurrence_pattern_reviews" (
    "id" TEXT NOT NULL,
    "pattern_id" CHAR(24) NOT NULL,
    "signature" VARCHAR(512) NOT NULL,
    "status" "RecurrencePatternReviewStatus" NOT NULL,
    "series_id" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recurrence_pattern_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recurrence_pattern_reviews_user_id_pattern_id_key"
ON "recurrence_pattern_reviews"("user_id", "pattern_id");

CREATE INDEX "recurrence_pattern_reviews_user_id_status_idx"
ON "recurrence_pattern_reviews"("user_id", "status");

CREATE INDEX "recurrence_pattern_reviews_series_id_idx"
ON "recurrence_pattern_reviews"("series_id");

CREATE INDEX "transaction_series_userId_type_ended_at_idx"
ON "transaction_series"("userId", "type", "ended_at");

CREATE UNIQUE INDEX "transaction_series_userId_source_key_key"
ON "transaction_series"("userId", "source_key");

ALTER TABLE "recurrence_pattern_reviews"
ADD CONSTRAINT "recurrence_pattern_reviews_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
