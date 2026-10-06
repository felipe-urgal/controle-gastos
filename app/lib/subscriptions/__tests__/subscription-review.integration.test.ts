import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from '@/app/lib/prisma';
import { reviewSubscription } from '@/app/lib/subscriptions/review-subscription';
import {
  getDetectedSubscriptionsForUser,
  getSubscriptionsForUser,
} from '@/app/lib/subscriptions/subscriptions';
import { FinancialTestFactory } from '@/tests/support/financial-test-factory';

const factory = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function request(status: 'CONFIRMED' | 'REJECTED' | 'IGNORED') {
  return new Request('http://localhost/api/subscriptions/pattern/review', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

async function monthlyHistory(userId: string) {
  const [account, category] = await Promise.all([
    factory.account(userId),
    factory.category(userId),
  ]);

  for (const month of [1, 2, 3]) {
    await factory.transaction({
      userId,
      accountId: account.id,
      categoryId: category.id,
      overrides: {
        amount: 4990,
        description: 'Streaming Premium',
        type: 'EXPENSE',
        status: 'COMPLETED',
        year: 2026,
        month,
        day: 10,
      },
    });
  }
}

describe('subscription review integration', () => {
  it('mantém classificação isolada por usuário', async () => {
    const [owner, other] = await Promise.all([factory.user(), factory.user()]);
    await monthlyHistory(owner.id);
    await monthlyHistory(other.id);

    const [ownerDetected, otherDetected] = await Promise.all([
      getDetectedSubscriptionsForUser(owner.id),
      getDetectedSubscriptionsForUser(other.id),
    ]);
    const ownerPattern = ownerDetected[0]!;
    const otherPattern = otherDetected[0]!;

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const foreign = await reviewSubscription(request('CONFIRMED'), {
      params: Promise.resolve({ id: otherPattern.id }),
    });
    expect(foreign.status).toBe(404);

    const own = await reviewSubscription(request('CONFIRMED'), {
      params: Promise.resolve({ id: ownerPattern.id }),
    });
    expect(own.status).toBe(200);

    expect(
      await prisma.subscriptionReview.findMany({
        select: { userId: true, patternId: true, status: true },
      }),
    ).toEqual([
      {
        userId: owner.id,
        patternId: ownerPattern.id,
        status: 'CONFIRMED',
      },
    ]);
  });

  it('retira assinatura possivelmente encerrada dos totais até nova revisão explícita', async () => {
    const owner = await factory.user();
    await monthlyHistory(owner.id);

    const [pattern] = await getDetectedSubscriptionsForUser(owner.id, {
      now: new Date('2026-03-20T12:00:00.000Z'),
    });
    expect(pattern).toBeDefined();

    const review = await prisma.subscriptionReview.create({
      data: {
        userId: owner.id,
        patternId: pattern!.id,
        status: 'CONFIRMED',
      },
    });
    await prisma.subscriptionReview.update({
      where: { id: review.id },
      data: { updatedAt: new Date('2026-03-20T12:00:00.000Z') },
    });

    const stale = await getSubscriptionsForUser(owner.id, {
      now: new Date('2026-06-20T12:00:00.000Z'),
    });
    expect(stale.confirmed[0]).toMatchObject({
      possiblyEnded: true,
      requiresActivityReview: true,
      activeForTotals: false,
    });
    expect(stale.totals).toHaveLength(0);

    await prisma.subscriptionReview.update({
      where: { id: review.id },
      data: { status: 'CONFIRMED', updatedAt: new Date('2026-06-20T12:00:00.000Z') },
    });

    const reviewed = await getSubscriptionsForUser(owner.id, {
      now: new Date('2026-06-20T12:00:00.000Z'),
    });
    expect(reviewed.confirmed[0]).toMatchObject({
      possiblyEnded: true,
      requiresActivityReview: false,
      activeForTotals: true,
    });
    expect(reviewed.totals[0]?.monthlyEquivalent).toBe(4990);
  });

  it('atualiza a decisão sem duplicar metadado de assinatura', async () => {
    const owner = await factory.user();
    await monthlyHistory(owner.id);
    const [pattern] = await getDetectedSubscriptionsForUser(owner.id);
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const confirmed = await reviewSubscription(request('CONFIRMED'), {
      params: Promise.resolve({ id: pattern!.id }),
    });
    expect(confirmed.status).toBe(200);

    const rejected = await reviewSubscription(request('REJECTED'), {
      params: Promise.resolve({ id: pattern!.id }),
    });
    expect(rejected.status).toBe(200);

    expect(
      await prisma.subscriptionReview.findMany({
        where: { userId: owner.id },
        select: { patternId: true, status: true },
      }),
    ).toEqual([{ patternId: pattern!.id, status: 'REJECTED' }]);
  });

  it('preserva identidade por merchantId após rename e desativação sem alterar descrições históricas', async () => {
    const owner = await factory.user();
    const [account, category, merchant] = await Promise.all([
      factory.account(owner.id),
      factory.category(owner.id),
      prisma.merchant.create({
        data: { userId: owner.id, name: 'Streaming Antigo' },
      }),
    ]);

    for (const month of [1, 2, 3]) {
      await factory.transaction({
        userId: owner.id,
        accountId: account.id,
        categoryId: category.id,
        overrides: {
          merchantId: merchant.id,
          amount: 4990,
          description: 'Descrição original da assinatura',
          type: 'EXPENSE',
          status: 'COMPLETED',
          year: 2026,
          month,
          day: 10,
        },
      });
    }

    const [before] = await getDetectedSubscriptionsForUser(owner.id, {
      now: new Date('2026-03-20T12:00:00.000Z'),
    });
    expect(before).toMatchObject({
      merchant: { id: merchant.id, name: 'Streaming Antigo' },
      description: 'Streaming Antigo',
    });
    expect(before.evidence.map((item) => item.description)).toEqual([
      'Descrição original da assinatura',
      'Descrição original da assinatura',
      'Descrição original da assinatura',
    ]);

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { name: 'Streaming Renomeado', isActive: false },
    });

    const [after] = await getDetectedSubscriptionsForUser(owner.id, {
      now: new Date('2026-03-20T12:00:00.000Z'),
    });

    expect(after.id).toBe(before.id);
    expect(after).toMatchObject({
      merchant: { id: merchant.id, name: 'Streaming Renomeado' },
      description: 'Streaming Renomeado',
    });
    expect(after.evidence.map((item) => item.description)).toEqual([
      'Descrição original da assinatura',
      'Descrição original da assinatura',
      'Descrição original da assinatura',
    ]);

    expect(
      await prisma.transaction.findMany({
        where: { userId: owner.id, merchantId: merchant.id },
        orderBy: { month: 'asc' },
        select: { description: true, merchantId: true },
      }),
    ).toEqual(
      Array.from({ length: 3 }, () => ({
        description: 'Descrição original da assinatura',
        merchantId: merchant.id,
      })),
    );
  });

});
