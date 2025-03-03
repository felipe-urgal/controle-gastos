/*
  Warnings:

  - Added the required column `userId` to the `Transacao` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AlterTable
ALTER TABLE "Transacao" ADD COLUMN "userId" TEXT;

-- Criar um usuário padrão caso ainda não exista
INSERT INTO "User" ("id", "name", "email", "password", "createdAt", "updatedAt") 
VALUES ('default-user-id', 'Felipe Urgal', 'felipearantesurgal@gmail.com', '123456', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Atualizar as transações existentes para vinculá-las ao usuário padrão
UPDATE "Transacao" SET "userId" = 'default-user-id' WHERE "userId" IS NULL;

-- Agora que todos os registros têm um userId, podemos torná-lo obrigatório
ALTER TABLE "Transacao" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
