/*
  Warnings:

  - A unique constraint covering the columns `[nome,userId]` on the table `Categoria` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Categoria` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Categoria_nome_key";

-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_userId_key" ON "Categoria"("nome", "userId");

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
