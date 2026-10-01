import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import {
  detectSubscriptions,
  SUBSCRIPTION_HISTORY_LIMIT,
  SUBSCRIPTION_WINDOW_MONTHS,
} from '@/app/lib/subscriptions/subscription-domain';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  SubscriptionCurrencyTotals,
  SubscriptionItem,
} from '@/app/types/subscription';

function windowStart() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth() - (SUBSCRIPTION_WINDOW_MONTHS - 1),
    1,
  );
  return { year: start.getFullYear(), month: start.getMonth() + 1 };
}

function fromWindow(start: { year: number; month: number }) {
  return {
    OR: [
      { year: { gt: start.year } },
      { year: start.year, month: { gte: start.month } },
    ],
  };
}

export async function getDetectedSubscriptionsForUser(userId: string) {
  const start = windowStart();
  const historical = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      kind: 'NORMAL',
      status: 'COMPLETED',
      transferId: null,
      ...fromWindow(start),
    },
    select: {
      id: true,
      amount: true,
      description: true,
      type: true,
      year: true,
      month: true,
      day: true,
      account: {
        select: { id: true, name: true, currency: true },
      },
      category: {
        select: { id: true, name: true },
      },
      merchant: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
      { day: 'desc' },
      { createdAt: 'desc' },
    ],
    take: SUBSCRIPTION_HISTORY_LIMIT,
  });

  return detectSubscriptions(historical);
}

export async function getSubscriptionsForUser(userId: string) {
  const [detected, reviews] = await Promise.all([
    getDetectedSubscriptionsForUser(userId),
    prisma.subscriptionReview.findMany({
      where: { userId },
      select: { patternId: true, status: true },
    }),
  ]);

  const statusByPattern = new Map(
    reviews.map((review) => [review.patternId, review.status]),
  );

  const confirmed: SubscriptionItem[] = [];
  const possible: SubscriptionItem[] = [];

  for (const subscription of detected) {
    const status = statusByPattern.get(subscription.id);

    if (status === 'CONFIRMED') {
      confirmed.push({ ...subscription, status: 'CONFIRMED' });
      continue;
    }

    if (status === 'REJECTED' || status === 'IGNORED') continue;
    possible.push({ ...subscription, status: 'POSSIBLE' });
  }

  const totalsMap = new Map<SupportedCurrency, SubscriptionCurrencyTotals>();
  for (const item of confirmed) {
    const current = totalsMap.get(item.currency) ?? {
      currency: item.currency,
      monthlyEquivalent: 0,
      annualEquivalent: 0,
    };
    current.monthlyEquivalent += item.monthlyEquivalent;
    current.annualEquivalent += item.annualEquivalent;
    totalsMap.set(item.currency, current);
  }

  const priceChanges = [...confirmed, ...possible].filter(
    (item) => item.priceChange !== null,
  );

  return {
    confirmed,
    possible,
    priceChanges,
    totals: ['BRL', 'USD', 'EUR']
      .map((currency) => totalsMap.get(currency as SupportedCurrency))
      .filter((item): item is SubscriptionCurrencyTotals => Boolean(item)),
    windowMonths: SUBSCRIPTION_WINDOW_MONTHS,
  };
}

export async function getSubscriptions() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await getSubscriptionsForUser(userId));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao carregar assinaturas',
    });
  }
}
