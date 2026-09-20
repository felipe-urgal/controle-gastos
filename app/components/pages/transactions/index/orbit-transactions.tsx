'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  FaArrowDown,
  FaArrowRight,
  FaArrowUp,
  FaCalendarAlt,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaCopy,
  FaExchangeAlt,
  FaExternalLinkAlt,
  FaFileImport,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTimes,
  FaWallet,
} from 'react-icons/fa';

import { ProtectedRoute } from '@/app/components/layout';
import type { FilterField } from '@/app/components/navigation/dynamic-filters';
import { Button, IconRenderer, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useTransactions } from '@/app/hooks/transactions/transaction-index';
import { statusConfig, transactionFilters } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { monthOptions, yearOptions } from '@/app/lib/date/constants';
import {
  getTransferCounterpartLabel,
  getTransferDirectionLabel,
  isTransferTransaction,
} from '@/app/lib/transactions/transaction-presentation';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import type { CurrencyFinancialSummary, SupportedCurrency } from '@/app/types/financial-summary';
import type { TransactionDTO } from '@/app/types/transaction';

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; type: 'INCOME' | 'EXPENSE' };
type TimelineOrder = 'newest' | 'oldest';

type TimelineGroup = {
  key: number;
  primaryLabel: string;
  secondaryLabel: string;
  items: TransactionDTO[];
};

type MonthBar = {
  value: number;
  tone: 'income' | 'expense' | 'neutral';
};

const REFINEMENT_FILTER_KEYS = new Set(['search', 'status', 'accountId', 'categoryId']);
const INITIAL_TIMELINE_ITEMS = 7;
const TIMELINE_INCREMENT = 7;
const BAR_BUCKETS = 8;

function transactionDateKey(transaction: TransactionDTO) {
  return transaction.year * 10000 + transaction.month * 100 + transaction.day;
}

function todayDateKey() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function logicalDateFromTransaction(transaction: TransactionDTO) {
  return new Date(transaction.year, transaction.month - 1, transaction.day);
}

function formatTimelinePrimary(transaction: TransactionDTO) {
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

function formatTimelineSecondary(transaction: TransactionDTO) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' })
    .format(logicalDateFromTransaction(transaction));
}

function formatTransactionTime(transaction: TransactionDTO) {
  const date = new Date(transaction.createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function monthTitle(month: number, year: number) {
  const value = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(year, month - 1, 1));
  return `${value.charAt(0).toUpperCase()}${value.slice(1)} de ${year}`;
}

function compactMonth(month: number, year: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(year, month - 1, 1))
    .replace('.', '');
}

function shiftPeriod(month: number, year: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function displayMoney(amount: number, showValues: boolean, currency: string) {
  return showValues ? formatCurrency(amount, currency) : '••••';
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function formatTrend(
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

function selectSummary(
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

function buildTimelineGroups(transactions: TransactionDTO[]): TimelineGroup[] {
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

function buildMonthBars(
  transactions: TransactionDTO[],
  currency: string,
  month: number,
  year: number,
): MonthBar[] {
  const buckets = Array.from({ length: BAR_BUCKETS }, () => ({ income: 0, expense: 0 }));
  const daysInMonth = new Date(year, month, 0).getDate();

  transactions
    .filter(
      (transaction) =>
        transaction.status === 'COMPLETED' &&
        transaction.kind === 'NORMAL' &&
        transaction.account.currency === currency,
    )
    .forEach((transaction) => {
      const index = Math.min(
        BAR_BUCKETS - 1,
        Math.floor(((transaction.day - 1) / Math.max(1, daysInMonth)) * BAR_BUCKETS),
      );
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
    return { value, tone };
  });
}

function scheduledDistanceLabel(transaction: TransactionDTO) {
  const target = new Date(transaction.year, transaction.month - 1, transaction.day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const distance = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (distance <= 0) return distance === 0 ? 'Hoje' : 'Em atraso';
  if (distance === 1) return 'Amanhã';
  return `Em ${distance} dias`;
}

function usePreviousSummary(
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
  ]);

  return { summaries, loading };
}

export default function OrbitTransactions() {
  const {
    loading,
    transactions,
    summary,
    filters,
    setFilters,
  } = useTransactions({ pagination: false });
  const { user } = useAuth();
  const showValues = user?.showValues !== false;

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDTO | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<TimelineOrder>('newest');
  const [timelineWindow, setTimelineWindow] = useState({
    key: '',
    count: INITIAL_TIMELINE_ITEMS,
  });
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);
  const periodCloseRef = useRef<HTMLButtonElement>(null);

  const month = Number(filters.month) || new Date().getMonth() + 1;
  const year = Number(filters.year) || new Date().getFullYear();
  const previousPeriod = shiftPeriod(month, year, -1);
  const previousSummaryState = usePreviousSummary(month, year, filters);

  useEffect(() => {
    let active = true;

    async function loadRelations() {
      try {
        const [accountsResponse, categoriesResponse] = await Promise.all([
          accountService.getAll(),
          categoryService.getAll(),
        ]);
        if (!active) return;
        setAccounts(accountsResponse.data?.items ?? []);
        setCategories(categoriesResponse.data?.items ?? []);
      } catch {
        if (!active) return;
        setAccounts([]);
        setCategories([]);
      }
    }

    void loadRelations();
    return () => {
      active = false;
    };
  }, []);

  useDialogLifecycle(Boolean(selectedTransaction), detailCloseRef, () => setSelectedTransaction(null));
  useDialogLifecycle(filtersOpen, filterCloseRef, () => setFiltersOpen(false));
  useDialogLifecycle(periodOpen, periodCloseRef, () => setPeriodOpen(false));

  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );

  const categoryOptions = useMemo(() => {
    const income = categories
      .filter((category) => category.type === 'INCOME')
      .map((category) => ({ value: category.id, label: category.name }));
    const expense = categories
      .filter((category) => category.type === 'EXPENSE')
      .map((category) => ({ value: category.id, label: category.name }));

    return [
      ...(income.length ? [{ label: 'Receitas', options: income }] : []),
      ...(expense.length ? [{ label: 'Despesas', options: expense }] : []),
    ];
  }, [categories]);

  const filtersWithRelations = useMemo<FilterField[]>(
    () => [
      ...transactionFilters.filter((field) => field.key !== 'month' && field.key !== 'year'),
      { type: 'select', key: 'accountId', label: 'Conta', options: accountOptions },
      { type: 'select', key: 'categoryId', label: 'Categoria', options: categoryOptions },
    ],
    [accountOptions, categoryOptions],
  );

  const refinementValues = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([key]) => REFINEMENT_FILTER_KEYS.has(key))),
    [filters],
  );

  const currentSummary = useMemo(
    () => selectSummary(summary as CurrencyFinancialSummary[] | undefined, transactions),
    [summary, transactions],
  );
  const previousSummary = useMemo(
    () =>
      previousSummaryState.summaries.find((item) => item.currency === currentSummary.currency) ??
      ({ currency: currentSummary.currency, income: 0, expense: 0, balance: 0 } satisfies CurrencyFinancialSummary),
    [currentSummary.currency, previousSummaryState.summaries],
  );

  const scopedCompleted = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.status === 'COMPLETED' &&
          transaction.kind === 'NORMAL' &&
          transaction.account.currency === currentSummary.currency,
      ),
    [currentSummary.currency, transactions],
  );

  const incomeCount = scopedCompleted.filter((item) => item.type === 'INCOME').length;
  const expenseCount = scopedCompleted.filter((item) => item.type === 'EXPENSE').length;
  const scheduled = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.status === 'PENDING' &&
            transaction.kind === 'NORMAL' &&
            transactionDateKey(transaction) >= todayDateKey() &&
            transaction.account.currency === currentSummary.currency,
        )
        .sort((left, right) => transactionDateKey(left) - transactionDateKey(right)),
    [currentSummary.currency, transactions],
  );
  const scheduledTotal = scheduled.reduce((sum, transaction) => sum + transaction.amount, 0);

  const sortedTransactions = useMemo(() => {
    const result = [...transactions].sort((left, right) => {
      const dateDifference = transactionDateKey(right) - transactionDateKey(left);
      if (dateDifference !== 0) return dateDifference;
      return right.createdAt.localeCompare(left.createdAt);
    });
    return timelineOrder === 'newest' ? result : result.reverse();
  }, [timelineOrder, transactions]);

  const timelineContextKey = [
    month,
    year,
    filters.search ?? '',
    filters.status ?? '',
    filters.accountId ?? '',
    filters.categoryId ?? '',
  ].join('|');
  const visibleCount =
    timelineWindow.key === timelineContextKey
      ? timelineWindow.count
      : INITIAL_TIMELINE_ITEMS;
  const timelineItems = sortedTransactions.slice(0, visibleCount);
  const timelineGroups = buildTimelineGroups(timelineItems);
  const monthBars = buildMonthBars(transactions, currentSummary.currency, month, year);
  const maxBar = Math.max(1, ...monthBars.map((item) => item.value));
  const incomeTrend = formatTrend(
    currentSummary.income,
    previousSummary.income,
    previousPeriod.month,
    previousPeriod.year,
  );
  const expenseTrend = formatTrend(
    currentSummary.expense,
    previousSummary.expense,
    previousPeriod.month,
    previousPeriod.year,
    true,
  );
  const balanceTrend = percentageChange(currentSummary.balance, previousSummary.balance);
  const activeFiltersCount = Object.values(refinementValues).filter(
    (value) => value !== undefined && value !== null && value !== '',
  ).length;

  function applyRefinementFilters(nextValues: Record<string, any>) {
    setFilters((previous) => ({
      month: previous.month,
      year: previous.year,
      ...nextValues,
    }));
  }

  function applyPeriod(nextMonth: number, nextYear: number) {
    setFilters((previous) => ({
      ...previous,
      month: String(nextMonth),
      year: String(nextYear),
    }));
  }

  function movePeriod(offset: number) {
    const next = shiftPeriod(month, year, offset);
    applyPeriod(next.month, next.year);
  }

  return (
    <ProtectedRoute>
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="hidden text-sm font-semibold uppercase tracking-[0.12em] text-[var(--orbit-primary)] sm:block">ORBIT / CENTRO OPERACIONAL</p>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:mt-1 sm:text-[30px]">Transações</h1>
            <Link
              href="/transacoes/importar"
              aria-label="Importar transações"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] sm:hidden"
            >
              <FaFileImport aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-1 hidden text-sm text-[var(--text-muted)] sm:block">Acompanhe toda a sua movimentação financeira de forma simples e organizada.</p>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="hidden flex-wrap justify-end gap-2 sm:flex">
            <Link href="/transacoes/importar" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
              <FaFileImport aria-hidden="true" /> Importar CSV/OFX
            </Link>
            <Link href="/transacoes/nova" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/45 bg-[var(--orbit-primary)] px-3.5 text-sm font-bold text-white transition-colors hover:bg-[var(--orbit-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
              <FaPlus aria-hidden="true" /> Nova transação
            </Link>
          </div>

          <div className="flex items-center justify-end gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => movePeriod(-1)}
                disabled={loading}
                aria-label="Mês anterior"
                className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                <FaChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPeriodOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={periodOpen}
                className="inline-flex min-h-9 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)]"
              >
                <FaCalendarAlt aria-hidden="true" /> {formatPeriod(month, year)}
              </button>
              <button
                type="button"
                onClick={() => movePeriod(1)}
                disabled={loading}
                aria-label="Próximo mês"
                className="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                <FaChevronRight aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label={activeFiltersCount > 0 ? `Filtros, ${activeFiltersCount} ativos` : 'Filtros'}
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <FaFilter aria-hidden="true" /> Filtros
            </button>
          </div>
        </div>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Resumo financeiro do período">
        <MonthSummaryCard
          label="Entradas"
          count={incomeCount}
          countLabel={incomeCount === 1 ? 'transação' : 'transações'}
          amount={displayMoney(currentSummary.income, showValues, currentSummary.currency)}
          tone="income"
          icon={<FaArrowUp aria-hidden="true" />}
          detail={incomeTrend.text}
          detailTone={previousSummaryState.loading ? 'neutral' : incomeTrend.tone}
          detailDirection={incomeTrend.direction}
        />
        <MonthSummaryCard
          label="Saídas"
          count={expenseCount}
          countLabel={expenseCount === 1 ? 'transação' : 'transações'}
          amount={displayMoney(currentSummary.expense, showValues, currentSummary.currency)}
          tone="expense"
          icon={<FaArrowDown aria-hidden="true" />}
          detail={expenseTrend.text}
          detailTone={previousSummaryState.loading ? 'neutral' : expenseTrend.tone}
          detailDirection={expenseTrend.direction}
        />
        <MonthSummaryCard
          label="Saldo do mês"
          amount={displayMoney(currentSummary.balance, showValues, currentSummary.currency)}
          tone="primary"
          icon={<FaWallet aria-hidden="true" />}
          detail={currentSummary.balance >= 0 ? 'Positivo neste mês' : 'Negativo neste mês'}
        />
        <MonthSummaryCard
          label="Agendadas"
          count={scheduled.length}
          countLabel={scheduled.length === 1 ? 'lançamento' : 'lançamentos'}
          amount={displayMoney(scheduledTotal, showValues, currentSummary.currency)}
          tone="scheduled"
          icon={<FaCalendarAlt aria-hidden="true" />}
          detail="Nos próximos dias"
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.88fr)_minmax(330px,1fr)]">
        <MovementTimeline
          month={month}
          year={year}
          groups={timelineGroups}
          order={timelineOrder}
          onOrderChange={setTimelineOrder}
          showValues={showValues}
          loading={loading}
          hasMore={visibleCount < sortedTransactions.length}
          onLoadMore={() =>
            setTimelineWindow({
              key: timelineContextKey,
              count: visibleCount + TIMELINE_INCREMENT,
            })
          }
          onOpen={setSelectedTransaction}
        />

        <aside className="grid content-start gap-4">
          <MonthOverview
            summary={currentSummary}
            previousSummary={previousSummary}
            bars={monthBars}
            maxBar={maxBar}
            showValues={showValues}
            balanceTrend={balanceTrend}
          />
          <UpcomingTransactions
            items={scheduled}
            showValues={showValues}
            onOpen={setSelectedTransaction}
            onViewAll={() => setFilters((previous) => ({ ...previous, status: 'PENDING' }))}
          />
        </aside>
      </section>

      <Link
        href="/transacoes/nova"
        aria-label="Nova transação"
        className="fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[var(--orbit-primary)] text-xl text-white shadow-[var(--shadow-surface)] sm:hidden"
        style={{ bottom: 'calc(var(--app-mobile-bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)' }}
      >
        <FaPlus aria-hidden="true" />
      </Link>

      {periodOpen && (
        <PeriodDialog
          closeRef={periodCloseRef}
          month={month}
          year={year}
          loading={loading}
          onApply={applyPeriod}
          onClose={() => setPeriodOpen(false)}
        />
      )}

      {filtersOpen && (
        <FilterDialog
          closeRef={filterCloseRef}
          fields={filtersWithRelations}
          values={refinementValues}
          loading={loading}
          total={transactions.length}
          onApply={applyRefinementFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {selectedTransaction && (
        <TransactionDetailLayer
          transaction={selectedTransaction}
          showValues={showValues}
          closeRef={detailCloseRef}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </ProtectedRoute>
  );
}

function MonthSummaryCard({
  label,
  count,
  countLabel,
  amount,
  tone,
  icon,
  detail,
  detailTone = 'neutral',
  detailDirection = 'flat',
}: {
  label: string;
  count?: number;
  countLabel?: string;
  amount: string;
  tone: 'income' | 'expense' | 'primary' | 'scheduled';
  icon: ReactNode;
  detail: string;
  detailTone?: 'positive' | 'negative' | 'neutral';
  detailDirection?: 'up' | 'down' | 'flat';
}) {
  const cardTone =
    tone === 'income'
      ? 'border-[var(--income)]/25 bg-[var(--primary-subtle)]/70'
      : tone === 'expense'
        ? 'border-[var(--expense)]/25 bg-[var(--danger-subtle)]/55'
        : tone === 'primary'
          ? 'border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)]'
          : 'border-[var(--orbit-primary)]/20 bg-[var(--surface-raised)]';
  const iconTone =
    tone === 'income'
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : tone === 'expense'
        ? 'bg-[var(--danger-subtle)] text-[var(--expense)]'
        : 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]';
  const amountTone =
    tone === 'income'
      ? 'text-[var(--income)]'
      : tone === 'expense'
        ? 'text-[var(--expense)]'
        : tone === 'primary'
          ? 'text-[var(--orbit-primary)]'
          : 'text-[var(--orbit-focus)]';
  const detailClass =
    detailTone === 'positive'
      ? 'text-[var(--income)]'
      : detailTone === 'negative'
        ? 'text-[var(--expense)]'
        : 'text-[var(--text-muted)]';

  return (
    <article className={`min-h-[138px] rounded-[14px] border p-4 ${cardTone}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${iconTone}`}>{icon}</span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--foreground)]">{label}</h2>
          <p className="mt-0.5 min-h-4 text-xs text-[var(--text-muted)]">
            {count !== undefined ? `${count} ${countLabel}` : '\u00A0'}
          </p>
          <strong className={`mt-2 block text-[24px] font-extrabold tracking-tight ${amountTone}`}>{amount}</strong>
          <p className={`mt-1 flex items-center gap-1.5 text-xs ${detailClass}`}>
            {detailDirection === 'up' ? <FaArrowUp aria-hidden="true" /> : detailDirection === 'down' ? <FaArrowDown aria-hidden="true" /> : null}
            {detail}
          </p>
        </div>
      </div>
    </article>
  );
}

function MovementTimeline({
  month,
  year,
  groups,
  order,
  onOrderChange,
  showValues,
  loading,
  hasMore,
  onLoadMore,
  onOpen,
}: {
  month: number;
  year: number;
  groups: TimelineGroup[];
  order: TimelineOrder;
  onOrderChange: (order: TimelineOrder) => void;
  showValues: boolean;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onOpen: (transaction: TransactionDTO) => void;
}) {
  return (
    <article className="min-h-[620px] rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Movimentação de {monthTitle(month, year).toLowerCase()}</h2>
        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          Ordenar por
          <span className="relative">
            <select
              value={order}
              onChange={(event) => onOrderChange(event.target.value as TimelineOrder)}
              className="min-h-10 appearance-none rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-3 pr-9 text-xs font-semibold text-[var(--foreground)] outline-none focus:border-[var(--orbit-primary)]"
            >
              <option value="newest">Mais recente</option>
              <option value="oldest">Mais antigo</option>
            </select>
            <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
          </span>
        </label>
      </header>

      {loading ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Carregando movimentações">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-[66px] animate-pulse rounded-[12px] bg-[var(--skeleton)]" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-5 grid min-h-[420px] place-items-center rounded-[12px] border border-dashed border-[var(--border)]">
          <div className="text-center">
            <p className="text-base font-bold">Nenhuma movimentação neste período</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Ajuste os filtros ou registre uma nova transação.</p>
          </div>
        </div>
      ) : (
        <div className="relative mt-5">
          <span className="absolute bottom-8 left-[15px] top-5 hidden w-px border-l border-dashed border-[var(--orbit-primary)]/45 md:block" aria-hidden="true" />
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.key} className="grid gap-2 md:grid-cols-[145px_minmax(0,1fr)] md:gap-3">
                <div className="relative flex items-start gap-3 md:pl-10">
                  <span className="absolute left-[6px] top-1.5 hidden h-[18px] w-[18px] rounded-full border-[6px] border-[var(--orbit-primary)] bg-[var(--surface)] md:block" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">{group.primaryLabel}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{group.secondaryLabel}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {group.items.map((transaction) => (
                    <TimelineTransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      showValues={showValues}
                      onOpen={() => onOpen(transaction)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMore && !loading && (
        <button
          type="button"
          onClick={onLoadMore}
          className="mx-auto mt-4 flex min-h-9 w-full max-w-[520px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-xs font-semibold hover:bg-[var(--surface-hover)]"
        >
          Ver mais transações <FaChevronDown aria-hidden="true" />
        </button>
      )}
    </article>
  );
}

function TimelineTransactionRow({
  transaction,
  showValues,
  onOpen,
}: {
  transaction: TransactionDTO;
  showValues: boolean;
  onOpen: () => void;
}) {
  const isTransfer = isTransferTransaction(transaction);
  const isIncome = transaction.type === 'INCOME';
  const amountTone = isTransfer
    ? 'text-[var(--orbit-primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';
  const iconBackground = isTransfer
    ? 'var(--orbit-primary-subtle)'
    : isIncome
      ? 'var(--primary-subtle)'
      : 'var(--danger-subtle)';
  const iconColor = isTransfer
    ? 'var(--orbit-primary)'
    : isIncome
      ? 'var(--income)'
      : 'var(--expense)';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir detalhe contextual da transação ${transaction.description || 'Sem descrição'}`}
      className="grid min-h-[66px] w-full grid-cols-[40px_minmax(0,1fr)_24px] items-center gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] sm:grid-cols-[44px_minmax(0,1fr)_110px_88px_24px] sm:gap-3"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[11px]" style={{ backgroundColor: iconBackground, color: iconColor }}>
        {isTransfer ? <FaExchangeAlt aria-hidden="true" /> : <IconRenderer iconName={transaction.category?.icon || (isIncome ? 'income-up' : 'tag')} size={16} />}
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-sm text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</strong>
        <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
          {isTransfer ? `Transferências · ${transaction.account?.name ?? 'Conta'}` : `${transaction.category?.name ?? 'Sem categoria'} · ${transaction.account?.name ?? 'Conta'}`}
          {isTransfer && <span className="sr-only"> · {getTransferCounterpartLabel(transaction)}</span>}
        </span>
      </span>
      <span className="col-span-2 col-start-2 row-start-2 flex min-w-0 items-center justify-between gap-3 text-right sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:grid sm:shrink-0 sm:justify-items-end sm:gap-1">
        <strong className={`text-sm ${amountTone}`}>{formatTransactionAmount(transaction, showValues)}</strong>
        <span className="text-xs text-[var(--text-muted)]">{formatTransactionTime(transaction)}</span>
      </span>
      <span className="col-start-2 row-start-3 justify-self-start sm:col-start-auto sm:row-start-auto sm:justify-self-center">
        <StatusPill status={transaction.status} />
      </span>
      <span className="col-start-3 row-start-1 text-center text-lg leading-none text-[var(--text-muted)] sm:col-start-auto sm:row-start-auto" aria-hidden="true">⋮</span>
    </button>
  );
}

function MonthOverview({
  summary,
  previousSummary,
  bars,
  maxBar,
  showValues,
  balanceTrend,
}: {
  summary: CurrencyFinancialSummary;
  previousSummary: CurrencyFinancialSummary;
  bars: MonthBar[];
  maxBar: number;
  showValues: boolean;
  balanceTrend: number | null;
}) {
  const positive = summary.balance >= 0;
  const insightTitle = positive ? 'Você está no positivo!' : 'Atenção ao saldo do mês';
  let insightText = positive
    ? `Saldo de ${displayMoney(summary.balance, showValues, summary.currency)} neste mês.`
    : `As saídas superam as entradas em ${displayMoney(Math.abs(summary.balance), showValues, summary.currency)}.`;

  if (balanceTrend !== null && previousSummary.balance !== 0) {
    const direction = balanceTrend >= 0 ? 'maior' : 'menor';
    insightText = `Seu saldo está ${Math.abs(balanceTrend).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% ${direction} que no mês passado.`;
  }

  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Visão do mês</h2>
        <Link href="/dashboard" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver relatório →</Link>
      </header>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_135px] items-end gap-4">
        <div className="grid h-[92px] grid-cols-8 items-end gap-1.5 border-b border-[var(--border)] px-1 pb-1">
          {bars.map((bar, index) => {
            const height = bar.value === 0 ? 10 : Math.max(18, Math.round((bar.value / maxBar) * 82));
            const tone =
              bar.tone === 'income'
                ? 'bg-[var(--income)]'
                : bar.tone === 'expense'
                  ? 'bg-[var(--expense)]'
                  : 'bg-[var(--surface-subtle)]';
            return (
              <span key={index} className="flex h-full min-w-0 items-end justify-center border-x border-[var(--border)]/25">
                <span className={`w-[68%] rounded-t-sm ${tone}`} style={{ height }} />
              </span>
            );
          })}
        </div>

        <div className="space-y-3 pb-1">
          <div className="flex items-start gap-2">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--income)]" />
            <div>
              <strong className="block text-base text-[var(--income)]">{displayMoney(summary.income, showValues, summary.currency)}</strong>
              <span className="text-xs text-[var(--text-muted)]">Entradas</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-[3px] border-[var(--expense)]" />
            <div>
              <strong className="block text-base text-[var(--expense)]">{displayMoney(summary.expense, showValues, summary.currency)}</strong>
              <span className="text-xs text-[var(--text-muted)]">Saídas</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
          {positive ? <FaArrowUp aria-hidden="true" /> : <FaArrowDown aria-hidden="true" />}
        </span>
        <div>
          <strong className="block text-sm">{insightTitle}</strong>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{insightText}</p>
        </div>
      </div>
    </article>
  );
}

function UpcomingTransactions({
  items,
  showValues,
  onOpen,
  onViewAll,
}: {
  items: TransactionDTO[];
  showValues: boolean;
  onOpen: (transaction: TransactionDTO) => void;
  onViewAll: () => void;
}) {
  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Próximos lançamentos</h2>
        <Link href="/calendario" className="text-xs font-semibold text-[var(--orbit-primary)]">Ver calendário →</Link>
      </header>

      <div className="mt-3 divide-y divide-[var(--border)]">
        {items.length === 0 ? (
          <div className="grid min-h-[210px] place-items-center rounded-[12px] border border-dashed border-[var(--border)] px-4 text-center">
            <div>
              <FaCalendarAlt className="mx-auto text-xl text-[var(--orbit-primary)]" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold">Nenhum lançamento agendado</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Seus próximos compromissos aparecerão aqui.</p>
            </div>
          </div>
        ) : (
          items.slice(0, 4).map((transaction) => (
            <button
              key={transaction.id}
              type="button"
              onClick={() => onOpen(transaction)}
              aria-label={`Abrir detalhe contextual da transação ${transaction.description || 'Sem descrição'}`}
              className="grid min-h-[62px] w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-2 px-1 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] sm:grid-cols-[44px_36px_minmax(0,1fr)_auto] sm:px-0"
            >
              <span className="grid h-11 w-11 place-content-center rounded-[9px] border border-[var(--border)] text-center">
                <strong className="text-sm leading-none">{String(transaction.day).padStart(2, '0')}</strong>
                <span className="mt-1 text-[9px] font-semibold uppercase text-[var(--text-muted)]">{compactMonth(transaction.month, transaction.year)}</span>
              </span>
              <span className="hidden h-9 w-9 place-items-center rounded-full bg-[var(--surface-subtle)] text-[var(--foreground)] sm:grid">
                <IconRenderer iconName={transaction.category?.icon || 'calendar'} size={14} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-xs">{transaction.description || 'Sem descrição'}</strong>
                <span className="mt-1 block truncate text-[11px] text-[var(--text-muted)]">
                  {transaction.category?.name ?? 'Sem categoria'} · {transaction.account?.name ?? 'Conta'}
                </span>
              </span>
              <span className="col-start-2 flex min-w-0 items-center justify-between gap-2 sm:col-start-auto sm:grid sm:shrink-0 sm:justify-items-end sm:gap-1">
                <strong className={`text-xs ${transaction.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                  {formatTransactionAmount(transaction, showValues)}
                </strong>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)]">{scheduledDistanceLabel(transaction)}</span>
                  <span className="rounded-full bg-[var(--orbit-primary-subtle)] px-2 py-1 text-[9px] font-bold text-[var(--orbit-primary)]">Agendada</span>
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      {items.length > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-semibold hover:bg-[var(--surface-hover)]"
        >
          Ver todos os agendados ({items.length}) <FaArrowRight aria-hidden="true" />
        </button>
      )}
    </article>
  );
}


function PeriodDialog({ closeRef, month, year, loading, onApply, onClose }: { closeRef: RefObject<HTMLButtonElement | null>; month: number; year: number; loading: boolean; onApply: (month: number, year: number) => void; onClose: () => void }) {
  const now = new Date();
  const [draftMonth, setDraftMonth] = useState(Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1);
  const [draftYear, setDraftYear] = useState(Number.isInteger(year) && year > 0 ? year : now.getFullYear());

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[var(--overlay)] sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="transaction-period-title" className="flex w-full flex-col overflow-hidden rounded-t-[20px] border border-[var(--border-strong)] bg-[var(--background)] shadow-[var(--shadow-surface)] sm:max-w-[430px] sm:rounded-[18px]">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--orbit-primary)]">Período</p>
            <h2 id="transaction-period-title" className="mt-1 text-xl font-bold">Selecionar mês</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Escolha o período usado na Inbox e no Histórico.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar seleção de período" className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaTimes aria-hidden="true" /></button>
        </header>

        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <Select label="Mês" value={draftMonth} onChange={(value) => setDraftMonth(Number(value))} options={monthOptions} disabled={loading} />
          <Select label="Ano" value={draftYear} onChange={(value) => setDraftYear(Number(value))} options={yearOptions} disabled={loading} />
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-[var(--border)] bg-[var(--surface)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" className="bg-[var(--orbit-primary)] text-white hover:bg-[var(--orbit-primary-hover)]" onClick={() => { onApply(draftMonth, draftYear); onClose(); }}>Aplicar período</Button>
        </footer>
      </section>
    </div>
  );
}

function FilterDialog({ closeRef, fields, values, loading, total, onApply, onClose }: { closeRef: RefObject<HTMLButtonElement | null>; fields: FilterField[]; values: Record<string, any>; loading: boolean; total?: number; onApply: (values: Record<string, any>) => void; onClose: () => void }) {
  const [draftValues, setDraftValues] = useState<Record<string, any>>(() => ({ ...values }));
  const activeCount = Object.values(draftValues).filter((value) => value !== undefined && value !== null && value !== '').length;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[var(--overlay)] sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="transaction-filter-title" className="flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-[20px] border border-[var(--border-strong)] bg-[var(--background)] shadow-[var(--shadow-surface)] sm:max-w-[720px] sm:rounded-[18px]">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--orbit-primary)]">Refinar Inbox</p>
            <h2 id="transaction-filter-title" className="mt-1 text-xl font-bold">Filtros</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{activeCount} filtro{activeCount === 1 ? '' : 's'} selecionado{activeCount === 1 ? '' : 's'}{total !== undefined ? ` · ${total} resultado${total === 1 ? '' : 's'}` : ''}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar filtros" className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaTimes aria-hidden="true" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-6 sm:p-5">
          <TransactionFilterFields fields={fields} values={draftValues} loading={loading} onChange={(key, value) => setDraftValues((previous) => ({ ...previous, [key]: value }))} />
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-[var(--border)] bg-[var(--surface)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <Button size="sm" variant="ghost" onClick={() => setDraftValues({})} disabled={activeCount === 0}>Limpar filtros</Button>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" className="bg-[var(--orbit-primary)] text-white hover:bg-[var(--orbit-primary-hover)]" onClick={() => { onApply(draftValues); onClose(); }}>Aplicar filtros</Button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function TransactionFilterFields({ fields, values, loading, onChange }: { fields: FilterField[]; values: Record<string, any>; loading: boolean; onChange: (key: string, value: any) => void }) {
  const searchField = fields.find((field) => field.type === 'search');
  const otherFields = fields.filter((field) => field.type !== 'search');

  return (
    <div className="space-y-5">
      {searchField?.type === 'search' && (
        <Input value={values[searchField.key] || ''} onChange={(event) => onChange(searchField.key, event.target.value)} placeholder={searchField.placeholder} aria-label={searchField.placeholder ?? 'Pesquisar'} icon={<FaSearch />} disabled={loading} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {otherFields.map((field) => {
          if (field.type === 'select') {
            const grouped = Array.isArray(field.options) && field.options.length > 0 && 'options' in field.options[0];
            return <Select key={field.key} label={field.label} value={values[field.key]} onChange={(value) => onChange(field.key, value)} options={field.options} placeholder="Todos" grouped={grouped} disabled={loading} />;
          }

          if (field.type === 'custom') {
            return <div key={field.key}>{field.render(values[field.key], (value) => onChange(field.key, value))}</div>;
          }

          return null;
        })}
      </div>
    </div>
  );
}

function TransactionDetailLayer({ transaction, showValues, onClose, closeRef }: { transaction: TransactionDTO; showValues: boolean; onClose: () => void; closeRef: RefObject<HTMLButtonElement | null> }) {
  return (
    <>
      <button type="button" className="fixed inset-0 z-[60] bg-[var(--overlay)]" onClick={onClose} aria-label="Fechar detalhe da transação" tabIndex={-1} />
      <aside role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title" className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[20px] border border-[var(--border-strong)] bg-[var(--background)] shadow-[var(--shadow-surface)] lg:inset-y-0 lg:left-auto lg:w-[430px] lg:max-h-none lg:rounded-none lg:border-y-0 lg:border-r-0">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)] p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--orbit-primary)]">Detalhe contextual</p>
            <h2 id="transaction-detail-title" className="mt-1 truncate text-lg font-bold">{transaction.description || 'Transação'}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar detalhe" className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaTimes aria-hidden="true" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto"><OrbitTransactionDetail transaction={transaction} showValues={showValues} /></div>
      </aside>
    </>
  );
}

function OrbitTransactionDetail({ transaction, showValues, compact = false }: { transaction: TransactionDTO; showValues: boolean; compact?: boolean }) {
  const isIncome = transaction.type === 'INCOME';
  const isTransfer = isTransferTransaction(transaction);
  const date = new Date(transaction.year, transaction.month - 1, transaction.day);
  const iconTone = isTransfer
    ? 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
    : isIncome
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : 'bg-[var(--danger-subtle)] text-[var(--expense)]';
  const amountTone = isTransfer
    ? 'text-[var(--orbit-primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';

  return (
    <div className={compact ? 'p-4' : 'p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]'}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] ${iconTone}`} aria-hidden="true">{isTransfer ? <FaExchangeAlt /> : isIncome ? <FaArrowUp /> : <FaArrowDown />}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{isTransfer ? getTransferDirectionLabel(transaction) : isIncome ? 'Receita' : 'Despesa'}</p>
        </div>
      </div>

      <p className={`mt-5 break-words text-3xl font-bold tracking-tight ${amountTone}`}>{formatTransactionAmount(transaction, showValues)}</p>
      <div className="mt-2"><StatusPill status={transaction.status} /></div>

      <dl className="mt-5 overflow-hidden rounded-[13px] border border-[var(--border)]">
        <DetailRow label="Data">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date)}</DetailRow>
        <DetailRow label="Conta">{transaction.account?.name ?? '—'}{transaction.account?.currency ? ` · ${transaction.account.currency}` : ''}</DetailRow>
        {isTransfer ? (
          <DetailRow label="Contraparte">{transaction.counterpartAccount?.name ?? 'Contraparte indisponível'}{transaction.counterpartAccount?.currency ? ` · ${transaction.counterpartAccount.currency}` : ''}</DetailRow>
        ) : (
          <DetailRow label="Categoria">{transaction.category?.name ?? '—'}</DetailRow>
        )}
        <DetailRow label="Status">{statusConfig[transaction.status as keyof typeof statusConfig]?.label ?? transaction.status}</DetailRow>
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {!isTransfer && (
          <>
            <Link href={`/transacoes/alterar/${transaction.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Editar</Link>
            <Link href={`/transacoes/nova?duplicate=${encodeURIComponent(transaction.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaCopy aria-hidden="true" /> Duplicar</Link>
          </>
        )}
        <Link href={`/transacoes/show/${transaction.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaExternalLinkAlt aria-hidden="true" /> Detalhes</Link>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 last:border-b-0"><dt className="text-sm text-[var(--text-muted)]">{label}</dt><dd className="min-w-0 text-right text-sm font-semibold text-[var(--foreground)]">{children}</dd></div>;
}

function StatusPill({ status }: { status: TransactionDTO['status'] }) {
  const label = statusConfig[status as keyof typeof statusConfig]?.label ?? status;
  const tone = status === 'COMPLETED'
    ? 'border-[var(--income)]/30 bg-[var(--primary-subtle)] text-[var(--income)]'
    : status === 'PENDING'
      ? 'border-[var(--warning)]/35 bg-[var(--warning-subtle)] text-[var(--pending)]'
      : 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]';

  return <span className={`inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-bold ${tone}`}>{label}</span>;
}

function formatPeriod(monthValue: unknown, yearValue: unknown) {
  const month = Number(monthValue);
  const year = Number(yearValue);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1) return null;

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(year, month - 1, 1));
  return `${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)}/${year}`;
}

function formatTransactionAmount(transaction: TransactionDTO, showValues: boolean) {
  if (!showValues) return '••••';
  const amount = formatCurrency(transaction.amount, transaction.account?.currency ?? 'BRL');
  return `${transaction.type === 'INCOME' ? '+' : '-'}${amount}`;
}

function useDialogLifecycle(open: boolean, closeRef: RefObject<HTMLButtonElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCloseRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previousFocus?.focus());
    };
  }, [closeRef, open]);
}
