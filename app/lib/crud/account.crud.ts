import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { createAccountSchema, updateAccountSchema } from "@/app/schemas/account.schema";
import { toAccountDTO } from "@/app/lib/mappers/account.mapper";
import { prisma } from "@/app/lib/prisma";

export const accountCrud = baseCrudHandler({
  model: (db) => db.account,
  entityName: "Conta",
  createSchema: createAccountSchema,
  updateSchema: updateAccountSchema,
  filterableFields: ["isActive", "type", "currency"],
  searchableFields: ["name", "description"],
  orderBy: { createdAt: "desc" },
  include: {
    _count: {
      select: {
        transactions: true,
      },
    },
    transactions: {
      orderBy: { createdAt: "desc" },
      take: 5,
    },
  },
  checkBeforeDelete: (account) => {
    if (account._count.transactions > 0)
      return "Conta possui transações vinculadas";

    return null;
  },
  afterList: async ({ items, userId }) => {

    const accountIds = items.map(a => a.id);
    if (!accountIds.length) return items;

    const transactionsAgg = await prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: {
        userId,
        status: "COMPLETED",
        accountId: { in: accountIds },
      },
      _sum: { amount: true },
    });

    const balanceMap: Record<string, number> = {};

    for (const account of items) {
      balanceMap[account.id] = 0;
    }

    for (const row of transactionsAgg) {
      const value = row._sum.amount ?? 0;

      if (row.type === "INCOME") {
        balanceMap[row.accountId] += value;
      } else {
        balanceMap[row.accountId] -= value;
      }
    }

    // 🔥 Atualiza no banco somente se diferente
    await prisma.$transaction(
      items.map(account => {
        const newBalance = balanceMap[account.id] ?? 0;

        if (account.balance !== newBalance) {
          return prisma.account.update({
            where: { id: account.id },
            data: { balance: newBalance },
          });
        }

        return prisma.$executeRaw`SELECT 1`;
      })
    );

    return items.map(account => ({
      ...account,
      balance: balanceMap[account.id] ?? 0,
    }));
  },
  mapper: toAccountDTO,
});
