import { compareLogicalDates, type LogicalDate } from '@/app/lib/date/logical-date';
import { addLogicalDays } from '@/app/lib/forecast/forecast-engine';
import { logicalDateFromUtcInstant } from '@/app/lib/forecast/forecast';
import type { FinancialInsightsData } from '@/app/types/financial-insight';
import type { ForecastData } from '@/app/types/forecast';
import type { PeriodicFinancialSummaryContent } from '@/app/types/periodic-financial-summary';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { SubscriptionsData } from '@/app/types/subscription';

export const PERIODIC_SUMMARY_TOP_CATEGORY_LIMIT = 5;
export const PERIODIC_SUMMARY_INSIGHT_LIMIT = 3;
export const PERIODIC_SUMMARY_COMMITMENT_LIMIT = 5;

export type PeriodicSummaryTransaction = {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: { id: string; name: string } | null;
  allocations: Array<{
    amount: number;
    category: { id: string; name: string };
  }>;
};

export function getCompletedWeeklySummaryPeriod(now: Date) {
  const asOf = logicalDateFromUtcInstant(now);
  const weekday = new Date(Date.UTC(asOf.year, asOf.month - 1, asOf.day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const currentWeekStart = addLogicalDays(asOf, -daysSinceMonday);
  const start = addLogicalDays(currentWeekStart, -7);
  const end = addLogicalDays(start, 6);

  return { start, end };
}

export function weeklyPeriodDates(period: { start: LogicalDate; end: LogicalDate }) {
  const dates: LogicalDate[] = [];
  let current = period.start;

  while (compareLogicalDates(current, period.end) <= 0) {
    dates.push(current);
    current = addLogicalDays(current, 1);
  }

  return dates;
}

function buildTotals(transactions: readonly PeriodicSummaryTransaction[]) {
  let income = 0;
  let expense = 0;

  for (const transaction of transactions) {
    if (transaction.type === 'INCOME') income += transaction.amount;
    if (transaction.type === 'EXPENSE') expense += transaction.amount;
  }

  return { income, expense, balance: income - expense };
}

function buildTopCategories(transactions: readonly PeriodicSummaryTransaction[]) {
  const totals = new Map<string, { categoryId: string; categoryName: string; amount: number }>();

  for (const transaction of transactions) {
    if (transaction.type !== 'EXPENSE') continue;

    if (transaction.allocations.length > 0) {
      for (const allocation of transaction.allocations) {
        const current = totals.get(allocation.category.id) ?? {
          categoryId: allocation.category.id,
          categoryName: allocation.category.name,
          amount: 0,
        };
        current.amount += allocation.amount;
        totals.set(allocation.category.id, current);
      }
      continue;
    }

    if (!transaction.category) continue;
    const current = totals.get(transaction.category.id) ?? {
      categoryId: transaction.category.id,
      categoryName: transaction.category.name,
      amount: 0,
    };
    current.amount += transaction.amount;
    totals.set(transaction.category.id, current);
  }

  return [...totals.values()]
    .sort((left, right) => {
      if (left.amount !== right.amount) return right.amount - left.amount;
      return left.categoryName.localeCompare(right.categoryName, 'pt-BR');
    })
    .slice(0, PERIODIC_SUMMARY_TOP_CATEGORY_LIMIT);
}

function buildUpcomingCommitments(forecast: ForecastData) {
  const through = addLogicalDays(forecast.asOf, 6);
  const inWindow = (date: LogicalDate) =>
    compareLogicalDates(date, forecast.asOf) >= 0 &&
    compareLogicalDates(date, through) <= 0;

  const transactionItems = forecast.upcoming
    .filter(
      (item) =>
        item.kind === 'NORMAL' &&
        item.type === 'EXPENSE' &&
        inWindow(item),
    )
    .map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount,
      dueDate: { year: item.year, month: item.month, day: item.day },
      source: 'TRANSACTION' as const,
    }));

  const cardItems = forecast.cardCommitments.upcoming
    .filter((item) => inWindow(item.dueDate))
    .map((item) => ({
      id: `card:${item.cardId}:${item.closingDate.year}-${item.closingDate.month}-${item.closingDate.day}`,
      description: `Fatura ${item.cardName}`,
      amount: item.amount,
      dueDate: item.dueDate,
      source: 'CARD_STATEMENT' as const,
    }));

  const all = [...transactionItems, ...cardItems].sort((left, right) => {
    const byDate = compareLogicalDates(left.dueDate, right.dueDate);
    if (byDate !== 0) return byDate;
    return left.description.localeCompare(right.description, 'pt-BR');
  });

  return {
    count: all.length,
    amount: all.reduce((sum, item) => sum + item.amount, 0),
    through,
    items: all.slice(0, PERIODIC_SUMMARY_COMMITMENT_LIMIT),
  };
}

export function buildWeeklyFinancialSummary(args: {
  period: { start: LogicalDate; end: LogicalDate };
  currency: SupportedCurrency;
  transactions: readonly PeriodicSummaryTransaction[];
  forecast: ForecastData;
  insights: FinancialInsightsData;
  subscriptions: SubscriptionsData;
}): PeriodicFinancialSummaryContent {
  const priceChanges = args.subscriptions.priceChanges
    .filter(
      (item) =>
        item.currency === args.currency &&
        !item.possiblyEnded &&
        item.priceChange !== null,
    )
    .map((item) => ({
      id: item.id,
      description: item.description,
      previousAmount: item.priceChange!.previousAmount,
      currentAmount: item.priceChange!.currentAmount,
      difference: item.priceChange!.difference,
      percentage: item.priceChange!.percent,
    }))
    .sort((left, right) => right.percentage - left.percentage)
    .slice(0, 3);

  const possibleNewCount = args.subscriptions.possible.filter(
    (item) => item.currency === args.currency && !item.possiblyEnded,
  ).length;

  return {
    frequency: 'WEEKLY',
    currency: args.currency,
    period: args.period,
    totals: buildTotals(args.transactions),
    topCategories: buildTopCategories(args.transactions),
    upcomingCommitments: buildUpcomingCommitments(args.forecast),
    insights: args.insights.items.slice(0, PERIODIC_SUMMARY_INSIGHT_LIMIT),
    safeToSpend: args.forecast.safeToSpend,
    subscriptions: {
      priceChanges,
      possibleNewCount,
    },
  };
}
