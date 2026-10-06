import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { logicalDateFromUtcInstant } from '@/app/lib/date/logical-date';
import {
  getFormalRecurrenceSummaryForUser,
  recurrenceSummarySignature,
} from '@/app/lib/recurrences/formal-recurrences';
import { recurrencePatternSignature } from '@/app/lib/recurrences/recurrence-domain';
import {
  getRecurringHistoryForUser,
  RECURRING_HISTORY_WINDOW_MONTHS,
  type RecurringHistoryTransaction,
} from '@/app/lib/recurrences/recurring-history';
import { prisma } from '@/app/lib/prisma';
import { detectSubscriptions } from '@/app/lib/subscriptions/subscription-domain';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { RecurrenceSummaryItem } from '@/app/types/recurrence';
import type {
  SubscriptionCurrencyTotals,
  SubscriptionItem,
} from '@/app/types/subscription';

type SubscriptionReadOptions = {
  historical?: RecurringHistoryTransaction[];
  formal?: RecurrenceSummaryItem[];
  now?: Date;
};

function recurrenceSignatureForSubscription(
  subscription: {
    description: string;
    frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval: number;
    account: { id: string };
    category: { id: string };
    merchant: { id: string } | null;
  },
) {
  return recurrencePatternSignature({
    accountId: subscription.account.id,
    categoryId: subscription.category.id,
    type: 'EXPENSE',
    merchantId: subscription.merchant?.id ?? null,
    description: subscription.description,
    frequency: subscription.frequency,
    interval: subscription.interval,
  });
}

function reviewThreshold(date: { year: number; month: number; day: number }) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export async function getDetectedSubscriptionsForUser(
  userId: string,
  options: Pick<SubscriptionReadOptions, 'historical' | 'now'> = {},
) {
  const now = options.now ?? new Date();
  const historical =
    options.historical ?? await getRecurringHistoryForUser(userId, now);

  return detectSubscriptions(
    historical,
    logicalDateFromUtcInstant(now),
  );
}

export async function getSubscriptionsForUser(
  userId: string,
  options: SubscriptionReadOptions = {},
) {
  const now = options.now ?? new Date();

  const [detected, reviews, formalResult] = await Promise.all([
    getDetectedSubscriptionsForUser(userId, {
      historical: options.historical,
      now,
    }),
    prisma.subscriptionReview.findMany({
      where: { userId },
      select: { patternId: true, status: true, updatedAt: true },
    }),
    options.formal
      ? Promise.resolve({ formal: options.formal })
      : getFormalRecurrenceSummaryForUser(userId),
  ]);

  const reviewByPattern = new Map(
    reviews.map((review) => [review.patternId, review]),
  );
  const activeSeriesBySignature = new Map(
    formalResult.formal.map((item) => [recurrenceSummarySignature(item), item.id]),
  );

  const confirmed: SubscriptionItem[] = [];
  const possible: SubscriptionItem[] = [];

  for (const subscription of detected) {
    const review = reviewByPattern.get(subscription.id);
    const recurrenceSeriesId =
      activeSeriesBySignature.get(recurrenceSignatureForSubscription(subscription)) ?? null;

    if (review?.status === 'CONFIRMED') {
      const requiresActivityReview =
        subscription.possiblyEnded &&
        subscription.possiblyEndedSince !== null &&
        review.updatedAt < reviewThreshold(subscription.possiblyEndedSince);

      confirmed.push({
        ...subscription,
        status: 'CONFIRMED',
        requiresActivityReview,
        activeForTotals: !requiresActivityReview,
        recurrenceSeriesId,
      });
      continue;
    }

    if (review?.status === 'REJECTED' || review?.status === 'IGNORED') continue;
    possible.push({
      ...subscription,
      status: 'POSSIBLE',
      requiresActivityReview: false,
      activeForTotals: false,
      recurrenceSeriesId: null,
    });
  }

  const totalsMap = new Map<SupportedCurrency, SubscriptionCurrencyTotals>();
  for (const item of confirmed) {
    if (!item.activeForTotals) continue;

    const current = totalsMap.get(item.currency) ?? {
      currency: item.currency,
      monthlyEquivalent: 0,
      annualEquivalent: 0,
    };
    current.monthlyEquivalent += item.monthlyEquivalent;
    current.annualEquivalent += item.annualEquivalent;
    totalsMap.set(item.currency, current);
  }

  const priceChanges = [
    ...confirmed.filter((item) => item.activeForTotals),
    ...possible.filter((item) => !item.possiblyEnded),
  ].filter((item) => item.priceChange !== null);

  return {
    confirmed,
    possible,
    priceChanges,
    totals: ['BRL', 'USD', 'EUR']
      .map((currency) => totalsMap.get(currency as SupportedCurrency))
      .filter((item): item is SubscriptionCurrencyTotals => Boolean(item)),
    windowMonths: RECURRING_HISTORY_WINDOW_MONTHS,
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
