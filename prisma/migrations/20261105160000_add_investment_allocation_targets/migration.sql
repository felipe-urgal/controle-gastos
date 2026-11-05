-- Alocação alvo da carteira por classe de ativo e moeda (cada conjunto soma 100%, validado na aplicação).

-- CreateTable
CREATE TABLE "investment_allocation_targets" (
  "id" TEXT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "asset_type" "InvestmentAssetType" NOT NULL,
  "percent" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "investment_allocation_targets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "investment_allocation_targets_percent_check" CHECK ("percent" BETWEEN 1 AND 100)
);

-- CreateIndex
CREATE UNIQUE INDEX "investment_allocation_targets_userId_currency_asset_type_key" ON "investment_allocation_targets"("userId", "currency", "asset_type");

-- AddForeignKey
ALTER TABLE "investment_allocation_targets" ADD CONSTRAINT "investment_allocation_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
