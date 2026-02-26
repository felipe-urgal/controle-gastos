import { prisma } from "@/app/lib/prisma";
import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { createTransactionSchema, updateTransactionSchema } from "@/app/schemas/transaction.schema";
import { toTransactionDTO } from "@/app/lib/mappers/transaction.mapper";

export const transactionCrud = baseCrudHandler({
  model: (db) => db.transaction,
  entityName: "Transação",
  createSchema: createTransactionSchema,
  updateSchema: updateTransactionSchema,
  filterableFields: [
    "accountId",
    "status",
    "year",
    "month",
    "day",
    "type",
  ],
  searchableFields: ["description"],
  orderBy: [
    { year: "desc" },
    { month: "desc" },
    { day: "desc" },
    { createdAt: "desc" }
  ],
  limit: true,
  include: {
    account: {
      select: {
        id: true,
        name: true,
        currency: true,
        type: true,
        color: true,
        icon: true
      }
    },
    category: {
      select: {
        id: true,
        name: true,
        type: true,
        color: true,
        icon: true
      }
    }
  },
  mapper: toTransactionDTO,

  async beforeCreate(data, userId) {
    return prisma.$transaction(async (tx) => {

      const account = await tx.account.findFirst({
        where: {
          id: data.accountId,
          userId,
          isActive: true,
        },
      });

      if (!account) {
        throw new Error("Conta inválida ou inativa");
      }

      const category = await tx.category.findFirst({
        where: {
          id: data.categoryId,
          userId,
        },
      });

      if (!category) {
        throw new Error("Categoria inválida");
      }

      const transactionType = category.type;

      const balanceChange =
        transactionType === "INCOME"
          ? data.amount
          : -data.amount;

      const transaction = await tx.transaction.create({
        data: {
          ...data,
          type: transactionType,
          userId,
        },
      })

      if (transaction.status === 'COMPLETED') {
        await tx.account.update({
          where: { id: account.id },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        })
      }

      return transaction;
    });
  },

  async beforeUpdate(data, existing, userId) {
    return prisma.$transaction(async (tx) => {

      const current = await tx.transaction.findFirst({
        where: { id: existing.id, userId },
        include: { account: true, category: true }
      });

      if (!current) {
        throw new Error("Transação não encontrada");
      }

      let newType = current.type;
      let newAmount = data.amount ?? current.amount;
      let newStatus = data.status ?? current.status;
      let newAccountId = data.accountId ?? current.accountId;

      if (data.categoryId) {
        const category = await tx.category.findFirst({
          where: { id: data.categoryId, userId }
        });

        if (!category) {
          throw new Error("Categoria inválida");
        }

        newType = category.type;
      }

      if (current.status === "COMPLETED") {
        const revert =
          current.type === "INCOME"
            ? -current.amount
            : current.amount;

        await tx.account.update({
          where: { id: current.accountId },
          data: {
            balance: { increment: revert }
          }
        });
      }

      if (newStatus === "COMPLETED") {
        const apply =
          newType === "INCOME"
            ? newAmount
            : -newAmount;

        await tx.account.update({
          where: { id: newAccountId },
          data: {
            balance: { increment: apply }
          }
        });
      }

      return {
        ...data,
        type: newType
      };
    });
  },

  async beforeDelete(entity, userId) {
    await prisma.$transaction(async (tx) => {

      if (entity.status === "COMPLETED") {
        const adjustment =
          entity.type === "INCOME"
            ? -entity.amount
            : entity.amount;

        await tx.account.update({
          where: { id: entity.accountId },
          data: {
            balance: { increment: adjustment }
          }
        });
      }

    });
  },
});