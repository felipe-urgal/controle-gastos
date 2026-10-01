import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { getFinancialInsightsForUser } from '@/app/lib/insights/financial-insights';
import { prisma } from '@/app/lib/prisma';

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createUser(label: string) {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `insights-${label}-${suffix}@example.com`,
      password: 'test-hash',
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe('financial insights integration', () => {
  it('compõe dados em lote respeitando ownership e moeda', async () => {
    const [owner, other] = await Promise.all([
      createUser('owner'),
      createUser('other'),
    ]);

    const [ownerAccount, otherAccount] = await Promise.all([
      prisma.account.create({
        data: {
          name: 'Conta BRL do owner',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: 'Conta BRL externa',
          type: 'CREDIT_DEBIT',
          currency: 'BRL',
          userId: other.id,
        },
      }),
    ]);

    const [ownerCategory, otherCategory] = await Promise.all([
      prisma.category.create({
        data: {
          name: 'Mercado owner',
          type: 'EXPENSE',
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: 'Categoria externa',
          type: 'EXPENSE',
          userId: other.id,
        },
      }),
    ]);

    await Promise.all([
      prisma.categoryMonthlyLimit.create({
        data: {
          amount: 100_000,
          year: 2026,
          month: 9,
          currency: 'BRL',
          userId: owner.id,
          categoryId: ownerCategory.id,
        },
      }),
      prisma.categoryMonthlyLimit.create({
        data: {
          amount: 100_000,
          year: 2026,
          month: 9,
          currency: 'BRL',
          userId: other.id,
          categoryId: otherCategory.id,
        },
      }),
      prisma.transaction.create({
        data: {
          amount: 85_000,
          year: 2026,
          month: 9,
          day: 10,
          type: 'EXPENSE',
          status: 'COMPLETED',
          description: 'Mercado realizado',
          accountId: ownerAccount.id,
          categoryId: ownerCategory.id,
          userId: owner.id,
        },
      }),
      prisma.transaction.create({
        data: {
          amount: 10_000,
          year: 2026,
          month: 9,
          day: 30,
          type: 'EXPENSE',
          status: 'PENDING',
          description: 'Mercado pendente',
          accountId: ownerAccount.id,
          categoryId: ownerCategory.id,
          userId: owner.id,
        },
      }),
      prisma.transaction.create({
        data: {
          amount: 999_999,
          year: 2026,
          month: 9,
          day: 29,
          type: 'EXPENSE',
          status: 'PENDING',
          description: 'Despesa externa',
          accountId: otherAccount.id,
          categoryId: otherCategory.id,
          userId: other.id,
        },
      }),
    ]);

    const result = await getFinancialInsightsForUser(
      owner.id,
      { year: 2026, month: 9 },
      'BRL',
      new Date('2026-09-28T12:00:00.000Z'),
    );

    expect(result.currency).toBe('BRL');
    expect(result.period).toEqual({ year: 2026, month: 9 });
    expect(result.items.map((item) => item.type)).toEqual([
      'SAFE_TO_SPEND',
      'FORECAST_BALANCE',
      'UPCOMING_PENDING',
      'CATEGORY_BUDGET',
    ]);

    const safeToSpend = result.items.find(
      (item) => item.type === 'SAFE_TO_SPEND',
    );
    expect(safeToSpend).toMatchObject({
      data: {
        state: 'NEGATIVE',
        realizedBalance: -85_000,
        pendingExpenses: 10_000,
        safeToSpend: -95_000,
      },
    });

    const budget = result.items.find(
      (item) => item.type === 'CATEGORY_BUDGET',
    );
    expect(budget).toMatchObject({
      data: {
        categoryId: ownerCategory.id,
        categoryName: 'Mercado owner',
        budget: 100_000,
        consumption: 95_000,
        percentage: 95,
      },
    });

    const pending = result.items.find(
      (item) => item.type === 'UPCOMING_PENDING',
    );
    expect(pending).toMatchObject({
      data: { count: 1, amount: 10_000 },
    });

    expect(JSON.stringify(result)).not.toContain('Categoria externa');
    expect(JSON.stringify(result)).not.toContain('999999');
  });

  it('omite insights futuros quando o período consultado não é o atual', async () => {
    const owner = await createUser('historical-owner');

    const result = await getFinancialInsightsForUser(
      owner.id,
      { year: 2026, month: 8 },
      'USD',
      new Date('2026-09-28T12:00:00.000Z'),
    );

    expect(result.items).toEqual([]);
  });
});
