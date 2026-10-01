-- CreateEnum
CREATE TYPE "SubscriptionReviewStatus" AS ENUM ('CONFIRMED', 'REJECTED', 'IGNORED');

-- CreateTable
CREATE TABLE "subscription_reviews" (
    "id" TEXT NOT NULL,
    "pattern_id" CHAR(24) NOT NULL,
    "status" "SubscriptionReviewStatus" NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_reviews_user_id_pattern_id_key"
ON "subscription_reviews"("user_id", "pattern_id");

-- CreateIndex
CREATE INDEX "subscription_reviews_user_id_status_idx"
ON "subscription_reviews"("user_id", "status");

-- AddForeignKey
ALTER TABLE "subscription_reviews"
ADD CONSTRAINT "subscription_reviews_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
