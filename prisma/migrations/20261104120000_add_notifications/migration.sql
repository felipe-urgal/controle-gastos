-- Avisos proativos: central de avisos dentro do app e preferências por tipo e canal.
-- Cada fato notificado tem uma chave de deduplicação estável (unique por usuário).

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'CARD_STATEMENT_DUE',
  'COMMITMENT_DUE',
  'INCOME_OVERDUE',
  'BUDGET_LIMIT',
  'FORECAST_NEGATIVE',
  'GOAL_DEADLINE',
  'SUMMARY'
);

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'URGENT');

-- CreateTable
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "dedupe_key" VARCHAR(200) NOT NULL,
  "severity" "NotificationSeverity" NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "body" VARCHAR(300) NOT NULL,
  "href" VARCHAR(200) NOT NULL,
  "read_at" TIMESTAMP(3),
  "dismissed_at" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "in_app" BOOLEAN NOT NULL DEFAULT true,
  "email" BOOLEAN NOT NULL DEFAULT false,
  "push" BOOLEAN NOT NULL DEFAULT false,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_userId_dedupe_key_key" ON "notifications"("userId", "dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_userId_read_at_created_at_idx" ON "notifications"("userId", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_type_key" ON "notification_preferences"("userId", "type");

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
