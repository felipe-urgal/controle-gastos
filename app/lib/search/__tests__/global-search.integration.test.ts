import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { getGlobalSearchForUser } from '@/app/lib/search/global-search';
import { GLOBAL_SEARCH_LIMIT_PER_GROUP } from '@/app/lib/search/global-search-schema';
import { prisma } from '@/app/lib/prisma';

const createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
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
      email: `global-search-${label}-${suffix}@example.com`,
      password: 'test-hash',
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe('global search integration', () => {
  it('searches only owned resources across all supported groups', async () => {
    const marker = `Café ${randomUUID().slice(0, 8)}`;
    const [owner, other] = await Promise.all([
      createUser('owner'),
      createUser('other'),
    ]);

    const [ownerAccount, otherAccount] = await Promise.all([
      prisma.account.create({
        data: {
          name: `${marker} Conta`,
          type: 'CREDIT_DEBIT',
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: `${marker} Outra`,
          type: 'CREDIT_DEBIT',
          userId: other.id,
        },
      }),
    ]);

    const [ownerCategory, otherCategory] = await Promise.all([
      prisma.category.create({
        data: {
          name: `${marker} Despesa`.slice(0, 50),
          type: 'EXPENSE',
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `${marker} Externa`.slice(0, 50),
          type: 'EXPENSE',
          userId: other.id,
        },
      }),
    ]);

    const [ownerTransaction, otherTransaction, ownerRule, otherRule] = await Promise.all([
      prisma.transaction.create({
        data: {
          amount: 12345,
          year: 2026,
          month: 9,
          day: 28,
          type: 'EXPENSE',
          description: `${marker} Mercado`,
          status: 'COMPLETED',
          accountId: ownerAccount.id,
          categoryId: ownerCategory.id,
          userId: owner.id,
        },
      }),
      prisma.transaction.create({
        data: {
          amount: 99999,
          year: 2026,
          month: 9,
          day: 28,
          type: 'EXPENSE',
          description: `${marker} Externo`,
          status: 'COMPLETED',
          accountId: otherAccount.id,
          categoryId: otherCategory.id,
          userId: other.id,
        },
      }),
      prisma.transactionImportRule.create({
        data: {
          name: `${marker} Regra`,
          transactionType: 'EXPENSE',
          descriptionOperator: 'CONTAINS',
          descriptionPattern: marker,
          categoryId: ownerCategory.id,
          userId: owner.id,
        },
      }),
      prisma.transactionImportRule.create({
        data: {
          name: `${marker} Regra externa`,
          transactionType: 'EXPENSE',
          descriptionOperator: 'CONTAINS',
          descriptionPattern: marker,
          categoryId: otherCategory.id,
          userId: other.id,
        },
      }),
    ]);

    const result = await getGlobalSearchForUser(owner.id, marker);

    const items = result.groups.flatMap((group) => group.items);
    expect(items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        ownerTransaction.id,
        ownerAccount.id,
        ownerCategory.id,
        ownerRule.id,
      ]),
    );
    const itemIds = new Set(items.map((item) => item.id));
    for (const foreignId of [
      otherTransaction.id,
      otherAccount.id,
      otherCategory.id,
      otherRule.id,
    ]) {
      expect(itemIds.has(foreignId)).toBe(false);
    }
    expect(JSON.stringify(result)).not.toContain('12345');
    expect(JSON.stringify(result)).not.toContain('99999');
  });

  it('limits each result group deterministically', async () => {
    const owner = await createUser('limit-owner');
    const marker = `Busca ${randomUUID().slice(0, 8)}`;

    await prisma.account.createMany({
      data: Array.from({ length: GLOBAL_SEARCH_LIMIT_PER_GROUP + 2 }, (_, index) => ({
        name: `${marker} ${String(index).padStart(2, '0')}`,
        type: 'CREDIT_DEBIT' as const,
        userId: owner.id,
      })),
    });

    const result = await getGlobalSearchForUser(owner.id, marker);
    const accounts = result.groups.find((group) => group.type === 'ACCOUNT');

    expect(accounts?.items).toHaveLength(GLOBAL_SEARCH_LIMIT_PER_GROUP);
    expect(accounts?.items.map((item) => item.title)).toEqual(
      [...(accounts?.items ?? [])].map((item) => item.title).sort((a, b) => a.localeCompare(b)),
    );
    expect(result.total).toBeLessThanOrEqual(result.totalLimit);
  });
  it('finds typo-tolerant transactions through descriptions, merchants, aliases and tags', async () => {
    const owner = await createUser('fuzzy-owner');
    const account = await prisma.account.create({
      data: {
        name: 'Conta fuzzy',
        type: 'CREDIT_DEBIT',
        userId: owner.id,
      },
    });
    const category = await prisma.category.create({
      data: {
        name: 'Transporte',
        type: 'EXPENSE',
        userId: owner.id,
      },
    });
    const merchant = await prisma.merchant.create({
      data: {
        name: 'Nubank Mobilidade',
        userId: owner.id,
        aliases: {
          create: {
            pattern: 'Uber Trip',
            normalizedPattern: 'uber trip',
            operator: 'CONTAINS',
            userId: owner.id,
          },
        },
      },
    });
    const tag = await prisma.tag.create({
      data: {
        name: 'transporte',
        normalizedName: 'transporte',
        userId: owner.id,
      },
    });
    const transaction = await prisma.transaction.create({
      data: {
        amount: 2590,
        year: 2026,
        month: 10,
        day: 1,
        type: 'EXPENSE',
        description: 'Corrida aplicativo',
        status: 'COMPLETED',
        accountId: account.id,
        categoryId: category.id,
        merchantId: merchant.id,
        userId: owner.id,
        tagLinks: {
          create: {
            userId: owner.id,
            tagId: tag.id,
          },
        },
      },
    });

    for (const query of ['nubnak', 'ubr trip', 'trasnporte']) {
      const result = await getGlobalSearchForUser(owner.id, query);
      const transactionGroup = result.groups.find(
        (group) => group.type === 'TRANSACTION',
      );

      expect(transactionGroup?.items.map((item) => item.id)).toContain(
        transaction.id,
      );
    }
  });

  it('does not leak fuzzy matches from another user', async () => {
    const [owner, other] = await Promise.all([
      createUser('fuzzy-owner-isolation'),
      createUser('fuzzy-other-isolation'),
    ]);
    const [account, category] = await Promise.all([
      prisma.account.create({
        data: {
          name: 'Conta externa',
          type: 'CREDIT_DEBIT',
          userId: other.id,
        },
      }),
      prisma.category.create({
        data: {
          name: 'Mercado externo',
          type: 'EXPENSE',
          userId: other.id,
        },
      }),
    ]);
    const external = await prisma.transaction.create({
      data: {
        amount: 1000,
        year: 2026,
        month: 10,
        day: 1,
        type: 'EXPENSE',
        description: 'Supermercado Central',
        status: 'COMPLETED',
        accountId: account.id,
        categoryId: category.id,
        userId: other.id,
      },
    });

    const result = await getGlobalSearchForUser(owner.id, 'supermercdo');
    expect(
      result.groups.flatMap((group) => group.items).map((item) => item.id),
    ).not.toContain(external.id);
  });

});
