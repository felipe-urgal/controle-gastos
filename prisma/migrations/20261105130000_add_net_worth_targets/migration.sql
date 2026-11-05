-- Meta de patrimônio por usuário e moeda (projeção calculada na leitura).

-- CreateTable
CREATE TABLE "net_worth_targets" (
  "id" TEXT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "amount" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "net_worth_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "net_worth_targets_userId_currency_key" ON "net_worth_targets"("userId", "currency");

-- AddForeignKey
ALTER TABLE "net_worth_targets" ADD CONSTRAINT "net_worth_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
