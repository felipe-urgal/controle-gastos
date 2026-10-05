import type { Category } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";

export async function withCategoryTransactionUsage<T extends Category>(
  category: T,
  userId: string,
): Promise<T & { transactionsCount: number }> {
  const [directIds, allocatedIds] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, categoryId: category.id },
      select: { id: true },
    }),
    prisma.transactionAllocation.findMany({
      where: { userId, categoryId: category.id },
      select: { transactionId: true },
    }),
  ]);

  const ids = new Set([
    ...directIds.map((item) => item.id),
    ...allocatedIds.map((item) => item.transactionId),
  ]);

  return { ...category, transactionsCount: ids.size };
}

export async function withCategoryTransactionUsages<T extends Category>(
  categories: T[],
  userId: string,
): Promise<Array<T & { transactionsCount: number }>> {
  if (categories.length === 0) return [];

  const categoryIds = categories.map((category) => category.id);
  const [directRows, allocationRows] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, categoryId: { in: categoryIds } },
      select: { id: true, categoryId: true },
    }),
    prisma.transactionAllocation.findMany({
      where: { userId, categoryId: { in: categoryIds } },
      select: { transactionId: true, categoryId: true },
    }),
  ]);

  const idsByCategory = new Map<string, Set<string>>();
  for (const id of categoryIds) idsByCategory.set(id, new Set());

  for (const row of directRows) {
    if (row.categoryId) idsByCategory.get(row.categoryId)?.add(row.id);
  }
  for (const row of allocationRows) {
    idsByCategory.get(row.categoryId)?.add(row.transactionId);
  }

  return categories.map((category) => ({
    ...category,
    transactionsCount: idsByCategory.get(category.id)?.size ?? 0,
  }));
}
