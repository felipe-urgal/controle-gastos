/*
  Warnings:

  - The values [INVESTMENT] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `investmentType` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `unit_value` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "investmentType",
DROP COLUMN "quantity",
DROP COLUMN "unit_value";
