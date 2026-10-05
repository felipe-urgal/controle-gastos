import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { confirmCandidateForUser } from '@/app/lib/recurrences/confirm-candidate';
import { getDetectedRecurrenceCandidatesForUser } from '@/app/lib/recurrences/detected-candidates';
import { endRecurrenceSeriesForUser } from '@/app/lib/recurrences/end-series';
import { getRecurrencesForUser } from '@/app/lib/recurrences/recurrences';
import { prisma } from '@/app/lib/prisma';
import { createRecurrenceFromSubscriptionForUser } from '@/app/lib/subscriptions/create-recurrence';
import type { SubscriptionItem } from '@/app/types/subscription';
import { FinancialTestFactory } from '@/tests/support/financial-test-factory';

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function monthlyHistory(userId: string, description: string) {
  const [account, category] = await Promise.all([
    fixtures.account(userId),
    fixtures.category(userId, { type: 'EXPENSE' }),
  ]);

  for (const month of [1, 2, 3]) {
    await fixtures.transaction({
      userId,
      accountId: account.id,
      categoryId: category.id,
      overrides: {
        amount: 4_990,
        description,
        type: 'EXPENSE',
        status: 'COMPLETED',
        year: 2028,
        month,
        day: 10,
      },
    });
  }

  return { account, category };
}

function subscriptionItem(input: {
  id: string;
  description: string;
  accountId: string;
  categoryId: string;
}): SubscriptionItem {
  return {
    id: input.id,
    status: 'CONFIRMED',
    description: input.description,
    frequency: 'MONTHLY',
    interval: 1,
    currency: 'BRL',
    currentAmount: 4_990,
    typicalAmount: 4_990,
    minAmount: 4_990,
    maxAmount: 4_990,
    monthlyEquivalent: 4_990,
    annualEquivalent: 59_880,
    lastCharge: { year: 2027, month: 12, day: 10 },
    nextCharge: { year: 2028, month: 1, day: 10 },
    occurrenceCount: 3,
    priceChange: null,
    possiblyEnded: false,
    requiresActivityReview: false,
    activeForTotals: true,
    recurrenceSeriesId: null,
    explanation: 'teste',
    evidence: [],
    account: { id: input.accountId, name: 'Conta' },
    category: { id: input.categoryId, name: 'Assinaturas' },
    merchant: null,
  };
}

describe('recurrence idempotency integration', () => {
  it('confirms one detected candidate exactly once under concurrent requests and never resurfaces it after ending', async () => {
    const owner = await fixtures.user();
    await monthlyHistory(owner.id, 'Streaming concorrente');

    const [candidate] = await getDetectedRecurrenceCandidatesForUser(
      owner.id,
      new Date('2028-03-20T12:00:00.000Z'),
    );
    expect(candidate).toBeDefined();

    const results = await Promise.all([
      confirmCandidateForUser(
        owner.id,
        candidate!,
        new Date('2028-03-20T12:00:00.000Z'),
      ),
      confirmCandidateForUser(
        owner.id,
        candidate!,
        new Date('2028-03-20T12:00:00.000Z'),
      ),
    ]);

    expect(new Set(results.map((item) => item.id))).toHaveLength(1);
    expect(
      await prisma.transactionSeries.count({
        where: { userId: owner.id, sourceKey: `candidate:${candidate!.id}` },
      }),
    ).toBe(1);
    expect(
      await prisma.recurrencePatternReview.count({
        where: { userId: owner.id, patternId: candidate!.id, status: 'CONFIRMED' },
      }),
    ).toBe(1);

    await endRecurrenceSeriesForUser(
      owner.id,
      results[0]!.id,
      new Date('2028-03-20T12:00:00.000Z'),
    );

    const overview = await getRecurrencesForUser(
      owner.id,
      new Date('2028-03-20T12:00:00.000Z'),
    );
    expect(overview.formal).toHaveLength(0);
    expect(overview.candidates).toHaveLength(0);
  });

  it('keeps a server-suppressed pattern hidden without creating a series', async () => {
    const owner = await fixtures.user();
    await monthlyHistory(owner.id, 'Academia suprimida');
    const [candidate] = await getDetectedRecurrenceCandidatesForUser(
      owner.id,
      new Date('2028-03-20T12:00:00.000Z'),
    );
    expect(candidate).toBeDefined();

    await prisma.recurrencePatternReview.create({
      data: {
        userId: owner.id,
        patternId: candidate!.id,
        signature: candidate!.signature,
        status: 'SUPPRESSED',
      },
    });

    const overview = await getRecurrencesForUser(
      owner.id,
      new Date('2028-03-20T12:00:00.000Z'),
    );
    expect(overview.candidates).toHaveLength(0);
    expect(await prisma.transactionSeries.count({ where: { userId: owner.id } })).toBe(0);
  });

  it('creates one subscription recurrence under concurrency but allows distinct descriptions without merchant', async () => {
    const owner = await fixtures.user();
    const [account, category] = await Promise.all([
      fixtures.account(owner.id),
      fixtures.category(owner.id, { type: 'EXPENSE' }),
    ]);
    const first = subscriptionItem({
      id: 'a'.repeat(24),
      description: 'Streaming Alfa',
      accountId: account.id,
      categoryId: category.id,
    });

    const [left, right] = await Promise.all([
      createRecurrenceFromSubscriptionForUser(
        owner.id,
        first,
        new Date('2028-01-01T12:00:00.000Z'),
      ),
      createRecurrenceFromSubscriptionForUser(
        owner.id,
        first,
        new Date('2028-01-01T12:00:00.000Z'),
      ),
    ]);

    expect('conflict' in left).toBe(false);
    expect('conflict' in right).toBe(false);
    if ('conflict' in left || 'conflict' in right) return;

    expect(new Set([left.id, right.id])).toHaveLength(1);

    const second = subscriptionItem({
      id: 'b'.repeat(24),
      description: 'Streaming Beta',
      accountId: account.id,
      categoryId: category.id,
    });
    const createdSecond = await createRecurrenceFromSubscriptionForUser(
      owner.id,
      second,
      new Date('2028-01-01T12:00:00.000Z'),
    );
    expect('conflict' in createdSecond).toBe(false);

    expect(
      await prisma.transactionSeries.count({
        where: { userId: owner.id, type: 'RECURRING', endedAt: null },
      }),
    ).toBe(2);
  });
});
