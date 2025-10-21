-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('TRAVEL', 'EMERGENCY_FUND', 'INVESTMENT', 'EDUCATION', 'HOME', 'VEHICLE', 'OTHER');

-- CreateTable
CREATE TABLE "financial_goals" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3) NOT NULL,
    "type" "GoalType" NOT NULL DEFAULT 'OTHER',
    "color" CHAR(7) NOT NULL DEFAULT '#3B82F6',
    "icon" VARCHAR(20) NOT NULL DEFAULT '🎯',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(500),
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_goals_userId_idx" ON "financial_goals"("userId");

-- CreateIndex
CREATE INDEX "financial_goals_userId_type_idx" ON "financial_goals"("userId", "type");

-- CreateIndex
CREATE INDEX "financial_goals_userId_isCompleted_idx" ON "financial_goals"("userId", "isCompleted");

-- CreateIndex
CREATE INDEX "financial_goals_deadline_idx" ON "financial_goals"("deadline");

-- CreateIndex
CREATE INDEX "financial_goals_userId_deadline_idx" ON "financial_goals"("userId", "deadline");

-- CreateIndex
CREATE INDEX "financial_goals_created_at_idx" ON "financial_goals"("created_at");

-- AddForeignKey
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
