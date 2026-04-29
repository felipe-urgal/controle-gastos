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
    "categoryId",
    "status",
    "year",
    "month",
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
      };

      const category = await tx.category.findFirst({
        where: {
          id: data.categoryId,
          userId,
        },
      });

      if (!category) {
        throw new Error("Categoria inválida");
      };

      const transactionType = category.type;

      const transaction = await tx.transaction.create({
        data: {
          ...data,
          type: transactionType,
          userId,
        },
      });

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
      };

      let newType = current.type;

      if (data.categoryId) {
        const category = await tx.category.findFirst({
          where: { id: data.categoryId, userId }
        });

        if (!category) {
          throw new Error("Categoria inválida");
        };

        newType = category.type;
      };

      return {
        ...data,
        type: newType
      };
    });
  },

  summary: async ({ where }) => {
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          ...where,
          type: "INCOME",
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          ...where,
          type: "EXPENSE",
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),
    ]);

    const income = incomeAgg._sum.amount ?? 0;
    const expense = expenseAgg._sum.amount ?? 0;

    return {
      income,
      expense,
      balance: income - expense,
    };
  },
});
