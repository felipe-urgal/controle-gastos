import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock('@/app/lib/auth', () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from '@/app/lib/prisma';
import { reviewSubscription } from '@/app/lib/subscriptions/review-subscription';
import { getDetectedSubscriptionsForUser } from '@/app/lib/subscriptions/subscriptions';
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
});
