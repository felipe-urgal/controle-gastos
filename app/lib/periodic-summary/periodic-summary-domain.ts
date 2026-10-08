import { compareLogicalDates, type LogicalDate } from '@/app/lib/date/logical-date';
import { realizedCashFlow } from '@/app/lib/dashboard/realized-cash-flow';
import type { PeriodicFinancialSummaryContent } from '@/app/types/periodic-financial-summary';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export const PERIODIC_SUMMARY_TOP_CATEGORY_LIMIT = 5;

export type PeriodicSummaryTransaction = {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  account: { type: 'CREDIT_DEBIT' | 'CREDIT_CARD' | 'INVESTMENT' };
  category: { id: string; name: string } | null;
  allocations: Array<{
    amount: number;
    category: { id: string; name: string };
  }>;
};

function shiftLogicalDays(date: LogicalDate, days: number): LogicalDate {
  if (!Number.isInteger(days)) throw new Error('Deslocamento de data inválido');
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function getCompletedWeeklySummaryPeriod(now: Date) {
  if (Number.isNaN(now.getTime())) throw new Error('Instante de referência inválido');
  const asOf: LogicalDate = {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
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
    const flow = realizedCashFlow({
      amount: transaction.amount,
      type: transaction.type,
      accountType: transaction.account.type,
    });
    income += flow.income;
    expense += flow.expense;
  }
  return { income, expense, balance: income - expense };
}

function buildTopCategories(transactions: readonly PeriodicSummaryTransaction[]) {
  const totals = new Map<string, { categoryId: string; categoryName: string; amount: number }>();
  const add = (category: { id: string; name: string }, amount: number) => {
    const current = totals.get(category.id) ?? {
      categoryId: category.id,
      categoryName: category.name,
      amount: 0,
    };
    current.amount += amount;
    totals.set(category.id, current);
  };

  for (const transaction of transactions) {
    const expense = realizedCashFlow({
      amount: transaction.amount,
      type: transaction.type,
      accountType: transaction.account.type,
    }).expense;
    if (expense === 0) continue;
    const factor = expense / transaction.amount;
    if (transaction.allocations.length > 0) {
      for (const allocation of transaction.allocations) {
        add(allocation.category, allocation.amount * factor);
      }
      continue;
    }
    add(transaction.category ?? { id: '__uncategorized__', name: 'Sem categoria' }, expense);
  }

  return [...totals.values()]
    .filter((item) => item.amount !== 0)
    .sort((left, right) => {
      if (left.amount !== right.amount) return right.amount - left.amount;
      return left.categoryName.localeCompare(right.categoryName, 'pt-BR');
    })
    .slice(0, PERIODIC_SUMMARY_TOP_CATEGORY_LIMIT);
}

export function buildWeeklyFinancialSummary(args: {
  period: { start: LogicalDate; end: LogicalDate };
  currency: SupportedCurrency;
  transactions: readonly PeriodicSummaryTransaction[];
}): PeriodicFinancialSummaryContent {
  return {
    frequency: 'WEEKLY',
    currency: args.currency,
    period: args.period,
    totals: buildTotals(args.transactions),
    topCategories: buildTopCategories(args.transactions),
  };
}
