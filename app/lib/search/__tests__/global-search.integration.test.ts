import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { getGlobalSearchForUser } from '@/app/lib/search/global-search';
import { createTransferForUser } from '@/app/lib/transfers/create-transfer';
import { payCreditCardStatementForUser } from '@/app/lib/cards/pay-credit-card-statement';
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
  it('identifica pernas de transferência e status sem apresentar valores', async () => {
    const owner = await createUser('special-transactions');
    const marker = `EspecialBusca${randomUUID().slice(0, 8)}`;
    const [source, destination, category] = await Promise.all([
      prisma.account.create({ data: { userId: owner.id, name: 'Origem especial', type: 'CREDIT_DEBIT' } }),
      prisma.account.create({ data: { userId: owner.id, name: 'Destino especial', type: 'CREDIT_DEBIT' } }),
      prisma.category.create({ data: { userId: owner.id, name: 'Categoria especial', type: 'EXPENSE' } }),
    ]);
    await createTransferForUser(owner.id, {
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amountCents: 987654,
      year: 2026, month: 9, day: 12,
      description: `${marker} transferência`,
      status: 'COMPLETED',
    }, randomUUID());
    await prisma.transaction.createMany({
      data: [
        {
          userId: owner.id, accountId: source.id, categoryId: category.id,
          description: `${marker} pendente`, amount: 987654,
          year: 2026, month: 9, day: 13, type: 'EXPENSE', status: 'PENDING',
        },
        {
          userId: owner.id, accountId: source.id, categoryId: category.id,
          description: `${marker} cancelada`, amount: 987654,
          year: 2026, month: 9, day: 14, type: 'EXPENSE', status: 'CANCELLED',
        },
      ],
    });
    const result = await getGlobalSearchForUser(owner.id, marker);
    const transactions = result.groups.find((group) => group.type === 'TRANSACTION')?.items ?? [];
    expect(transactions).toHaveLength(4);
    expect(transactions.map((item) => item.subtitle)).toEqual(expect.arrayContaining([
      expect.stringContaining('Transferência · Origem'),
      expect.stringContaining('Transferência · Destino'),
      expect.stringContaining('Pendente'),
      expect.stringContaining('Cancelada'),
    ]));
    expect(JSON.stringify(result)).not.toContain('987654');
  });

  it('identifica pagamento de fatura sem exibir o montante', async () => {
    const owner = await createUser('card-payment-search');
    const suffix = randomUUID().slice(0, 8);
    const [card, source, category] = await Promise.all([
      prisma.account.create({ data: {
        userId: owner.id, name: `Cartão Busca ${suffix}`, type: 'CREDIT_CARD',
        currency: 'BRL', creditLimit: 100_000, statementClosingDay: 5, statementDueDay: 12,
      } }),
      prisma.account.create({ data: { userId: owner.id, name: 'Pagadora busca', type: 'CREDIT_DEBIT', currency: 'BRL' } }),
      prisma.category.create({ data: { userId: owner.id, name: 'Categoria fatura', type: 'EXPENSE' } }),
    ]);
    await prisma.transaction.create({ data: {
      userId: owner.id, accountId: card.id, categoryId: category.id,
      amount: 98765, year: 2026, month: 9, day: 4,
      type: 'EXPENSE', status: 'COMPLETED', description: 'Compra da fatura busca',
    } });
    await payCreditCardStatementForUser(owner.id, card.id, {
      sourceAccountId: source.id,
      statementClosingDate: '2026-09-05',
      paymentDate: '2026-09-05',
    }, randomUUID());
    const result = await getGlobalSearchForUser(owner.id, `Pagamento fatura ${card.name}`);
    const transactions = result.groups.find((group) => group.type === 'TRANSACTION')?.items ?? [];
    expect(transactions.some((item) => item.subtitle?.includes('Pagamento de fatura'))).toBe(true);
    expect(JSON.stringify(result)).not.toContain('98765');
  });

  it('isola estabelecimentos, tags, modelos, dívidas e metas com estados e sem valores', async () => {
    const [owner, foreign] = await Promise.all([createUser('new-groups-owner'), createUser('new-groups-foreign')]);
    const marker = `EntidadeBusca${randomUUID().slice(0, 8)}`;
    const entities = await Promise.all([
      prisma.merchant.create({ data: { userId: owner.id, name: `${marker} Estabelecimento`, isActive: false } }),
      prisma.tag.create({ data: { userId: owner.id, name: marker.slice(0, 30), normalizedName: marker.slice(0, 30).toLowerCase(), isActive: false } }),
      prisma.transactionTemplate.create({ data: { userId: owner.id, name: `${marker} Modelo`, type: 'EXPENSE' } }),
      prisma.debt.create({ data: { userId: owner.id, name: `${marker} Dívida`, balance: 987654, status: 'PAID' } }),
      prisma.financialGoal.create({ data: { userId: owner.id, name: `${marker} Meta`, targetAmount: 987654, status: 'COMPLETED' } }),
    ]);
    const foreignEntities = await Promise.all([
      prisma.merchant.create({ data: { userId: foreign.id, name: `${marker} Loja externa` } }),
      prisma.tag.create({ data: { userId: foreign.id, name: marker.slice(0, 30), normalizedName: marker.slice(0, 30).toLowerCase() } }),
      prisma.transactionTemplate.create({ data: { userId: foreign.id, name: `${marker} Modelo externo`, type: 'EXPENSE' } }),
      prisma.debt.create({ data: { userId: foreign.id, name: `${marker} Dívida externa`, balance: 987654 } }),
      prisma.financialGoal.create({ data: { userId: foreign.id, name: `${marker} Meta externa`, targetAmount: 987654 } }),
    ]);
    const result = await getGlobalSearchForUser(owner.id, marker);
    const all = result.groups.flatMap((group) => group.items);
    expect(all.map((item) => item.id)).toEqual(expect.arrayContaining(entities.map((item) => item.id)));
    for (const foreignEntity of foreignEntities) {
      expect(all.some((item) => item.id === foreignEntity.id)).toBe(false);
    }
    expect(result.groups.map((group) => group.type)).toEqual(expect.arrayContaining(['MERCHANT', 'TAG', 'TEMPLATE', 'DEBT', 'GOAL']));
    expect(all.find((item) => item.id === entities[0].id)?.subtitle).toBe('Inativo');
    expect(all.find((item) => item.id === entities[1].id)?.subtitle).toBe('Arquivada');
    expect(all.find((item) => item.id === entities[3].id)?.subtitle).toBe('Quitada');
    expect(all.find((item) => item.id === entities[4].id)?.subtitle).toBe('Concluída');
    expect(JSON.stringify(result)).not.toContain('987654');
    expect(result.total).toBeLessThanOrEqual(result.totalLimit);
  });

  it('prioriza uma descrição idêntica antiga acima de mais de cinco matches recentes', async () => {
    const owner = await createUser('relevance-owner');
    const marker = `BuscaUnica${randomUUID().slice(0, 8)}`;
    const account = await prisma.account.create({
      data: { name: 'Conta relevância', type: 'CREDIT_DEBIT', userId: owner.id },
    });
    const category = await prisma.category.create({
      data: { name: 'Categoria relevância', type: 'EXPENSE', userId: owner.id },
    });
    await Promise.all(Array.from({ length: 7 }, (_, index) =>
      prisma.transaction.create({
        data: {
          userId: owner.id, accountId: account.id, categoryId: category.id,
          description: `${marker} adicional ${index}`, type: 'EXPENSE',
          status: 'COMPLETED', amount: 100, year: 2026, month: 10, day: 8,
        },
      }),
    ));
    const older = await prisma.transaction.create({
      data: {
        userId: owner.id, accountId: account.id, categoryId: category.id,
        description: marker, type: 'EXPENSE', status: 'COMPLETED',
        amount: 100, year: 2020, month: 1, day: 1,
      },
    });
    const result = await getGlobalSearchForUser(owner.id, marker);
    const items = result.groups.find((group) => group.type === 'TRANSACTION')?.items ?? [];
    expect(items[0]?.id).toBe(older.id);
    expect(items[0]?.matchedField).toBe('description');
    expect(items[0]?.matchKind).toBe('exact');
    expect(items).toHaveLength(GLOBAL_SEARCH_LIMIT_PER_GROUP);
  });

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

    for (const [query, expectedField, expectedText] of [
      ['Nubank Mobilidade', 'merchant', 'Nubank Mobilidade'],
      ['Uber Trip', 'alias', 'Uber Trip'],
      ['transporte', 'tag', 'transporte'],
      ['#transporte', 'tag', 'transporte'],
    ] as const) {
      const search = await getGlobalSearchForUser(owner.id, query);
      const match = search.groups.flatMap((group) => group.items)
        .find((item) => item.id === transaction.id);
      expect(match?.matchedField).toBe(expectedField);
      expect(match?.matchedText).toBe(expectedText);
      expect(match?.subtitle).toContain(expectedField === 'alias' ? 'Alias: Uber Trip' : expectedField === 'merchant' ? 'Nubank Mobilidade' : '#transporte');
      expect(JSON.stringify(search)).not.toContain('2590');
    }

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

  it('não perde o nome exato de um estabelecimento entre mais de 50 ocorrências', async () => {
    const owner = await createUser('catalog-rank');
    const marker = `BuscaCatalogo${randomUUID().slice(0, 8)}`;
    await prisma.merchant.createMany({
      data: Array.from({ length: 52 }, (_, index) => ({
        userId: owner.id,
        name: `A${String(index).padStart(3, '0')} ${marker}`,
        normalizedName: `a${String(index).padStart(3, '0')} ${marker.toLowerCase()}`,
      })),
    });
    const exact = await prisma.merchant.create({
      data: { userId: owner.id, name: marker },
    });

    const result = await getGlobalSearchForUser(owner.id, marker);
    const group = result.groups.find((item) => item.type === 'MERCHANT');
    expect(group?.items).toHaveLength(GLOBAL_SEARCH_LIMIT_PER_GROUP);
    expect(group?.items[0]?.id).toBe(exact.id);
  });

  it('explica matches secundários de Dívida, Modelo e Meta sem amounts', async () => {
    const owner = await createUser('secondary-match');
    const marker = `BuscaAux${randomUUID().slice(0, 8)}`;
    const [debt, template, goal] = await Promise.all([
      prisma.debt.create({ data: {
        userId: owner.id, name: 'Dívida secundária', institution: marker, balance: 987654,
      } }),
      prisma.transactionTemplate.create({ data: {
        userId: owner.id, name: 'Modelo secundário',
        description: `${marker} com valor livre 987654`, type: 'EXPENSE',
      } }),
      prisma.financialGoal.create({ data: {
        userId: owner.id, name: 'Meta secundária',
        description: `${marker} com valor livre 987654`, targetAmount: 987654,
      } }),
    ]);
    const result = await getGlobalSearchForUser(owner.id, marker);
    const items = result.groups.flatMap((group) => group.items);
    for (const id of [debt.id, template.id, goal.id]) {
      const item = items.find((entry) => entry.id === id);
      expect(item?.matchedText).toBe(marker);
      expect(item?.subtitle).toContain(id === debt.id ? marker : 'Correspondência na descrição');
    }
    expect(JSON.stringify(result)).not.toContain('987654');
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
