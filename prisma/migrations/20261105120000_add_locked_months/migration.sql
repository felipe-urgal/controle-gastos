-- Travar o mês: estado próprio do mês, com reabertura explícita.
-- Não altera lançamentos existentes nem reconciliação.

-- CreateTable
CREATE TABLE "locked_months" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "locked_months_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locked_months_userId_year_month_key" ON "locked_months"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "locked_months" ADD CONSTRAINT "locked_months_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
