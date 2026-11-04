-- Entrega dos avisos fora do app: e-mail diário e push do PWA.
-- emailed_at / pushed_at marcam o que já foi entregue, para nenhuma execução reenviar.

-- AlterTable
ALTER TABLE "notifications"
  ADD COLUMN "emailed_at" TIMESTAMP(3),
  ADD COLUMN "pushed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "push_subscriptions" (
  "id" TEXT NOT NULL,
  "endpoint" VARCHAR(2048) NOT NULL,
  "p256dh" VARCHAR(256) NOT NULL,
  "auth" VARCHAR(256) NOT NULL,
  "user_agent" VARCHAR(255),
  "last_success_at" TIMESTAMP(3),
  "disabled_at" TIMESTAMP(3),
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_disabled_at_idx" ON "push_subscriptions"("userId", "disabled_at");

-- AddForeignKey
ALTER TABLE "push_subscriptions"
ADD CONSTRAINT "push_subscriptions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
