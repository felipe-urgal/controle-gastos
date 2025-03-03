-- CreateTable
CREATE TABLE "Transacao" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transacao_pkey" PRIMARY KEY ("id")
);
