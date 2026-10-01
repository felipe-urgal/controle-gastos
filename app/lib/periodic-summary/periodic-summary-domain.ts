import { compareLogicalDates, type LogicalDate } from '@/app/lib/date/logical-date';
import type { FinancialInsightsData } from '@/app/types/financial-insight';
import type { PeriodicFinancialSummaryContent } from '@/app/types/periodic-financial-summary';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { SubscriptionsData } from '@/app/types/subscription';

export const PERIODIC_SUMMARY_TOP_CATEGORY_LIMIT = 5;
export const PERIODIC_SUMMARY_INSIGHT_LIMIT = 3;
export const PERIODIC_SUMMARY_COMMITMENT_LIMIT = 5;

type PeriodicSummaryForecastInput = {
  asOf: LogicalDate;
  upcoming: readonly Array<LogicalDate & {
    id: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    kind?: 'NORMAL' | 'TRANSFER' | 'CARD_PAYMENT';
    description: string;
  }>;
  cardCommitments: {
    upcoming: readonly Array<{
      cardId: string;
      cardName: string;
      amount: number;
      closingDate: LogicalDate;
      dueDate: LogicalDate;
    }>;
  };
  safeToSpend: {
    realizedBalance: number;
    pendingExpenses: number;
    cardCommitments: number;
    transferNet: number;
    safeToSpend: number;
  };
};

function shiftLogicalDays(date: LogicalDate, days: number): LogicalDate {
  if (!Number.isInteger(days)) {
    throw new Error('Deslocamento de data inválido');
  }

  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function logicalDateFromUtcInstant(now: Date): LogicalDate {
  if (Number.isNaN(now.getTime())) {
    throw new Error('Instante de referência inválido');
  }
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
}

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
  const currentWeekStart = shiftLogicalDays(asOf, -daysSinceMonday);
  const start = shiftLogicalDays(currentWeekStart, -7);
  const end = shiftLogicalDays(start, 6);

  return { start, end };
}

export function weeklyPeriodDates(period: { start: LogicalDate; end: LogicalDate }) {
  const dates: LogicalDate[] = [];
  let current = period.start;

  while (compareLogicalDates(current, period.end) <= 0) {
    dates.push(current);
    current = shiftLogicalDays(current, 1);
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

function buildUpcomingCommitments(forecast: PeriodicSummaryForecastInput) {
  const through = shiftLogicalDays(forecast.asOf, 6);
  const inWindow = (date: LogicalDate) =>
    compareLogicalDates(date, forecast.asOf) >= 0 &&
    compareLogicalDates(date, through) <= 0;

  const transactionItems = forecast.upcoming
    .filter(
      (item) =>
        (item.kind ?? 'NORMAL') === 'NORMAL' &&
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
  forecast: PeriodicSummaryForecastInput;
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
    safeToSpend: {
      realizedBalance: args.forecast.safeToSpend.realizedBalance,
      pendingExpenses: args.forecast.safeToSpend.pendingExpenses,
      cardCommitments: args.forecast.safeToSpend.cardCommitments,
      transferNet: args.forecast.safeToSpend.transferNet,
      safeToSpend: args.forecast.safeToSpend.safeToSpend,
    },
    subscriptions: {
      priceChanges,
      possibleNewCount,
    },
  };
}
