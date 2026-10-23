import { wrappableMoney } from '@/app/lib/currency/wrappable-money';
import { useEffect, useState } from 'react';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { transactionService } from '@/app/services/transaction-service';
import { CurrencyFinancialSummary, SupportedCurrency } from '@/app/types/financial-summary';
import { TransactionDTO } from '@/app/types/transaction';

export type AccountOption = { id: string; name: string };

export type CategoryOption = { id: string; name: string; type: 'INCOME' | 'EXPENSE' };

export type TimelineOrder = 'newest' | 'oldest';

export type MobileQuickFilter = 'all' | 'income' | 'expense' | 'pending';

export type TimelineGroup = {
  key: number;
  primaryLabel: string;
  secondaryLabel: string;
  items: TransactionDTO[];
};

export type MonthBar = {
  value: number;
  tone: 'income' | 'expense' | 'neutral';
  income: number;
  expense: number;
  /** Primeiro e último dia do mês que a coluna cobre. */
  fromDay: number;
  toDay: number;
};

export const REFINEMENT_FILTER_KEYS = new Set(['search', 'status', 'accountId', 'categoryId', 'merchantId', 'tagId']);

export const INITIAL_TIMELINE_ITEMS = 7;

export const TIMELINE_INCREMENT = 7;

export const BAR_BUCKETS = 8;

export function transactionDateKey(transaction: TransactionDTO) {
  return transaction.year * 10000 + transaction.month * 100 + transaction.day;
}

export function todayDateKey() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

export function logicalDateFromTransaction(transaction: TransactionDTO) {
  return new Date(transaction.year, transaction.month - 1, transaction.day);
}

export function formatTimelinePrimary(transaction: TransactionDTO) {
  const key = transactionDateKey(transaction);
  const todayKey = todayDateKey();
  if (key === todayKey) return 'Hoje';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.getFullYear() * 10000 + (yesterday.getMonth() + 1) * 100 + yesterday.getDate();
  if (key === yesterdayKey) return 'Ontem';

  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(logicalDateFromTransaction(transaction))
    .replace('.', '');
}

export function formatTimelineSecondary(transaction: TransactionDTO) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' })
    .format(logicalDateFromTransaction(transaction));
}

export function formatTransactionTime(transaction: TransactionDTO) {
  const date = new Date(transaction.createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function monthTitle(month: number, year: number) {
  const value = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(year, month - 1, 1));
  return `${value.charAt(0).toUpperCase()}${value.slice(1)} de ${year}`;
}

export function compactMonth(month: number, year: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(year, month - 1, 1))
    .replace('.', '');
}

export function shiftPeriod(month: number, year: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? wrappableMoney(formatCurrency(amount, currency)) : '••••';
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function formatTrend(
  current: number,
  previous: number,
  previousMonth: number,
  previousYear: number,
  inverseTone = false,
) {
  const percentage = percentageChange(current, previous);
  if (percentage === null) {
    return {
      text: 'Sem base no mês anterior',
      tone: 'neutral' as const,
      direction: 'flat' as const,
    };
  }

  const positive = inverseTone ? percentage <= 0 : percentage >= 0;
  const sign = percentage > 0 ? '+' : '';
  return {
    text: `${sign}${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% em relação a ${compactMonth(previousMonth, previousYear)}.`,
    tone: positive ? 'positive' as const : 'negative' as const,
    direction: percentage >= 0 ? 'up' as const : 'down' as const,
  };
}

export function selectSummary(
  summaries: CurrencyFinancialSummary[] | undefined,
  transactions: TransactionDTO[],
): CurrencyFinancialSummary {
  const available = summaries ?? [];
  const brl = available.find((item) => item.currency === 'BRL');
  if (brl) return brl;
  if (available[0]) return available[0];

  const fallbackCurrency = transactions.find((item) => item.account?.currency)?.account.currency;
  const currency: SupportedCurrency =
    fallbackCurrency === 'USD' || fallbackCurrency === 'EUR' ? fallbackCurrency : 'BRL';

  const completed = transactions.filter(
    (item) => item.status === 'COMPLETED' && item.kind === 'NORMAL' && item.account.currency === currency,
  );
  const income = completed
    .filter((item) => item.type === 'INCOME')
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = completed
    .filter((item) => item.type === 'EXPENSE')
    .reduce((sum, item) => sum + item.amount, 0);

  return { currency, income, expense, balance: income - expense };
}

export function buildTimelineGroups(transactions: TransactionDTO[]): TimelineGroup[] {
  const groups = new Map<number, TimelineGroup>();

  transactions.forEach((transaction) => {
    const key = transactionDateKey(transaction);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(transaction);
      return;
    }

    groups.set(key, {
      key,
      primaryLabel: formatTimelinePrimary(transaction),
      secondaryLabel: formatTimelineSecondary(transaction),
      items: [transaction],
    });
  });

  return [...groups.values()];
}

export function buildMonthBars(
  transactions: TransactionDTO[],
  currency: string,
  month: number,
  year: number,
): MonthBar[] {
  const buckets = Array.from({ length: BAR_BUCKETS }, () => ({ income: 0, expense: 0, fromDay: 0, toDay: 0 }));
  const daysInMonth = new Date(year, month, 0).getDate();
  const bucketOf = (day: number) => Math.min(BAR_BUCKETS - 1, Math.floor(((day - 1) / Math.max(1, daysInMonth)) * BAR_BUCKETS));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const bucket = buckets[bucketOf(day)];
    if (bucket.fromDay === 0) bucket.fromDay = day;
    bucket.toDay = day;
  }

  transactions
    .filter(
      (transaction) =>
        transaction.status === 'COMPLETED' &&
        transaction.kind === 'NORMAL' &&
        transaction.account.currency === currency,
    )
    .forEach((transaction) => {
      const index = bucketOf(transaction.day);
      if (transaction.type === 'INCOME') buckets[index].income += transaction.amount;
      else buckets[index].expense += transaction.amount;
    });

  return buckets.map((bucket) => {
    const value = Math.abs(bucket.income - bucket.expense);
    const tone =
      bucket.income === 0 && bucket.expense === 0
        ? 'neutral'
        : bucket.income >= bucket.expense
          ? 'income'
          : 'expense';
    return { value, tone, income: bucket.income, expense: bucket.expense, fromDay: bucket.fromDay, toDay: bucket.toDay };
  });
}

export function scheduledDistanceLabel(transaction: TransactionDTO) {
  const target = new Date(transaction.year, transaction.month - 1, transaction.day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const distance = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (distance <= 0) return distance === 0 ? 'Hoje' : 'Em atraso';
  if (distance === 1) return 'Amanhã';
  return `Em ${distance} dias`;
}

export function usePreviousSummary(
  month: number,
  year: number,
  filters: Record<string, any>,
) {
  const [summaries, setSummaries] = useState<CurrencyFinancialSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const previous = shiftPeriod(month, year, -1);
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const response = await transactionService.getAll({
          month: previous.month,
          year: previous.year,
          page: 1,
          pageSize: 1,
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.accountId ? { accountId: filters.accountId } : {}),
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          ...(filters.merchantId ? { merchantId: filters.merchantId } : {}),
          ...(filters.tagId ? { tagId: filters.tagId } : {}),
        });
        if (active) setSummaries(response.data?.summary ?? []);
      } catch {
        if (active) setSummaries([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [
    month,
    year,
    filters.search,
    filters.status,
    filters.accountId,
    filters.categoryId,
    filters.merchantId,
    filters.tagId,
  ]);

  return { summaries, loading };
}

export function formatPeriod(monthValue: unknown, yearValue: unknown) {
  const month = Number(monthValue);
  const year = Number(yearValue);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1) return null;

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(year, month - 1, 1));
  return `${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)}/${year}`;
}

export function formatTransactionAmount(transaction: TransactionDTO, showValues: boolean) {
  if (!showValues) return '••••';
  const amount = formatCurrency(transaction.amount, transaction.account?.currency ?? 'BRL');
  return `${transaction.type === 'INCOME' ? '+' : '-'}${amount}`;
}
