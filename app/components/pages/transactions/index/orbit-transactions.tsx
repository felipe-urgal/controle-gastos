'use client';

import { pageTitleClassName } from '@/app/components/base-pages/page-title';

import { useMediaQuery } from '@/app/hooks/use-media-query';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowDown, FaArrowUp, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaFileImport, FaFilter, FaPlus, FaWallet } from 'react-icons/fa';

import { IconButton } from '@/app/components/ui';
import { ProtectedRoute } from '@/app/components/layout';
import type { FilterField } from '@/app/components/navigation/dynamic-filters';

import { useAuth } from '@/app/context';
import { useTransactions } from '@/app/hooks/transactions/transaction-index';
import { transactionFilters } from '@/app/lib/constants/transaction.constants';

import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { merchantService } from '@/app/services/merchant-service';

import type { CurrencyFinancialSummary, SupportedCurrency } from '@/app/types/financial-summary';
import type { MerchantDTO } from '@/app/types/merchant';
import type { TransactionDTO } from '@/app/types/transaction';

import { AccountOption, CategoryOption, INITIAL_TIMELINE_ITEMS, MobileQuickFilter, REFINEMENT_FILTER_KEYS, TIMELINE_INCREMENT, TimelineOrder, buildMonthBars, buildTimelineGroups, displayMoney, formatPeriod, formatTrend, percentageChange, selectSummary, shiftPeriod, todayDateKey, transactionDateKey, usePreviousSummary } from '@/app/components/pages/transactions/index/transactions-view-helpers';
import { FilterDialog, PeriodDialog, TagFilterField, TransactionDetailLayer } from '@/app/components/pages/transactions/index/transaction-dialogs';
import { MobileTransactionsPrototype2 } from '@/app/components/pages/transactions/index/mobile-transactions';
import { MonthOverview, MonthSummaryCard, MovementTimeline, UpcomingTransactions } from '@/app/components/pages/transactions/index/desktop-transactions';

export default function OrbitTransactions() {
  const {
    loading,
    error,
    transactions,
    summary,
    filters,
    setFilters,
    total,
    hasMore,
    loadMore,
  } = useTransactions({
    pagination: true,
    appendPagination: true,
    initialPageSize: 100,
  });
  const { user } = useAuth();
  const showValues = user?.showValues !== false;

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [merchants, setMerchants] = useState<MerchantDTO[]>([]);
  const isTabletUp = useMediaQuery('(min-width: 640px)');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDTO | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<TimelineOrder>('newest');
  const [mobileQuickFilter, setMobileQuickFilter] = useState<MobileQuickFilter>('all');
  const [summaryCurrency, setSummaryCurrency] = useState<SupportedCurrency | null>(null);
  const [timelineWindow, setTimelineWindow] = useState({
    key: '',
    count: INITIAL_TIMELINE_ITEMS,
  });

  const month = Number(filters.month) || new Date().getMonth() + 1;
  const year = Number(filters.year) || new Date().getFullYear();
  const previousPeriod = shiftPeriod(month, year, -1);
  const previousSummaryState = usePreviousSummary(month, year, filters);

  useEffect(() => {
    let active = true;

    async function loadRelations() {
      try {
        const [accountsResult, categoriesResult, merchantsResult] = await Promise.allSettled([
          accountService.getAll(),
          categoryService.getAll(),
          merchantService.getAllOptions(),
        ]);
        if (!active) return;
        setAccounts(accountsResult.status === 'fulfilled' ? accountsResult.value.data?.items ?? [] : []);
        setCategories(categoriesResult.status === 'fulfilled' ? categoriesResult.value.data?.items ?? [] : []);
        setMerchants(merchantsResult.status === 'fulfilled' ? merchantsResult.value : []);
      } catch {
        if (!active) return;
      }
    }

    void loadRelations();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const openFilters = () => setFiltersOpen(true);
    window.addEventListener('transactions:open-filters', openFilters);
    return () => window.removeEventListener('transactions:open-filters', openFilters);
  }, []);

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
      {
        type: 'select',
        key: 'merchantId',
        label: 'Estabelecimento',
        options: merchants.map((merchant) => ({
          value: merchant.id,
          label: merchant.isActive ? merchant.name : `${merchant.name} (inativo)`,
        })),
      },
      {
        type: 'custom',
        key: 'tagId',
        render: (value, onChange) => (
          <TagFilterField value={value} onChange={onChange} />
        ),
      },
    ],
    [accountOptions, categoryOptions, merchants],
  );

  const refinementValues = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([key]) => REFINEMENT_FILTER_KEYS.has(key))),
    [filters],
  );

  const availableSummaries = useMemo(
    () => (summary as CurrencyFinancialSummary[] | undefined) ?? [],
    [summary],
  );
  const currentSummary = useMemo(() => {
    const selected = summaryCurrency
      ? availableSummaries.find((item) => item.currency === summaryCurrency)
      : undefined;
    return selected ?? selectSummary(availableSummaries, transactions);
  }, [availableSummaries, summaryCurrency, transactions]);
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
  const scheduledTotal = scheduled.reduce(
    (sum, transaction) =>
      sum + (transaction.type === 'INCOME' ? transaction.amount : -transaction.amount),
    0,
  );

  const sortedTransactions = useMemo(() => {
    const timelineSource = filters.status
      ? transactions
      : transactions.filter((transaction) => transaction.status === 'COMPLETED');
    const result = [...timelineSource].sort((left, right) => {
      const dateDifference = transactionDateKey(right) - transactionDateKey(left);
      if (dateDifference !== 0) return dateDifference;
      return right.createdAt.localeCompare(left.createdAt);
    });
    return timelineOrder === 'newest' ? result : result.reverse();
  }, [filters.status, timelineOrder, transactions]);

  const timelineContextKey = [
    month,
    year,
    filters.search ?? '',
    filters.status ?? '',
    filters.accountId ?? '',
    filters.categoryId ?? '',
    filters.merchantId ?? '',
    filters.tagId ?? '',
  ].join('|');
  const visibleCount =
    timelineWindow.key === timelineContextKey
      ? timelineWindow.count
      : INITIAL_TIMELINE_ITEMS;
  const timelineItems = sortedTransactions.slice(0, visibleCount);
  const timelineGroups = buildTimelineGroups(timelineItems);
  const mobileTransactions = useMemo(() => {
    const scoped = transactions.filter((transaction) => {
      if (mobileQuickFilter === 'pending') return transaction.status === 'PENDING';
      if (transaction.status !== 'COMPLETED') return false;
      if (mobileQuickFilter === 'income') return transaction.kind === 'NORMAL' && transaction.type === 'INCOME';
      if (mobileQuickFilter === 'expense') return transaction.kind === 'NORMAL' && transaction.type === 'EXPENSE';
      return true;
    });

    return [...scoped].sort((left, right) => {
      const dateDifference = transactionDateKey(right) - transactionDateKey(left);
      if (dateDifference !== 0) return dateDifference;
      return right.createdAt.localeCompare(left.createdAt);
    });
  }, [mobileQuickFilter, transactions]);
  const mobileGroups = buildTimelineGroups(mobileTransactions);
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
      {error && (
        <div role="alert" className="mb-4 rounded-[12px] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] px-4 py-3 text-sm font-semibold text-[var(--expense)]">
          {error}. Tente novamente ou altere o período/filtros.
        </div>
      )}
      {availableSummaries.length > 1 && (
        <label className="mb-4 flex items-center justify-end gap-2 text-xs font-semibold text-[var(--text-muted)]">
          Resumo em
          <select
            aria-label="Moeda do resumo financeiro"
            value={currentSummary.currency}
            onChange={(event) => setSummaryCurrency(event.target.value as SupportedCurrency)}
            className="min-h-11 sm:min-h-9 rounded-[9px] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm font-bold text-[var(--foreground)]"
          >
            {availableSummaries.map((item) => (
              <option key={item.currency} value={item.currency}>{item.currency}</option>
            ))}
          </select>
        </label>
      )}
      {!isTabletUp && (
      <div>
        <MobileTransactionsPrototype2
          month={month}
          year={year}
          summary={currentSummary}
          scheduled={scheduled}
          groups={mobileGroups}
          quickFilter={mobileQuickFilter}
          activeFiltersCount={activeFiltersCount}
          showValues={showValues}
          loading={loading}
          onMovePeriod={movePeriod}
          onOpenPeriod={() => setPeriodOpen(true)}
          onOpenFilters={() => setFiltersOpen(true)}
          onQuickFilterChange={setMobileQuickFilter}
          onOpenTransaction={setSelectedTransaction}
          onShowPending={() => setMobileQuickFilter('pending')}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>
      )}

      {isTabletUp && (
      <div>
              <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="hidden text-sm font-semibold uppercase tracking-[0.12em] text-[var(--orbit-primary)] sm:block">ORBIT / CENTRO OPERACIONAL</p>
                  <div className="flex items-center justify-between gap-3">
                    <h1 className={`sm:mt-1 ${pageTitleClassName}`}>Transações</h1>
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
                      <FaFileImport aria-hidden="true" /> Importar CSV/OFX/QFX/QIF/XLSX
                    </Link>
                    <Link href="/transacoes/nova" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/45 bg-[var(--orbit-primary)] px-3.5 text-sm font-bold text-white transition-colors hover:bg-[var(--orbit-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
                      <FaPlus aria-hidden="true" /> Nova transação
                    </Link>
                  </div>
        
                  <div className="flex items-center justify-end gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="inline-flex shrink-0 items-center gap-1.5">
                      <IconButton
                        label="Mês anterior"
                        icon={<FaChevronLeft />}
                        onClick={() => movePeriod(-1)}
                        disabled={loading}
                        className="border border-[var(--border)] bg-[var(--surface)]"
                      />
                      <button
                        type="button"
                        onClick={() => setPeriodOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={periodOpen}
                        className="inline-flex min-h-11 sm:min-h-9 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)]"
                      >
                        <FaCalendarAlt aria-hidden="true" /> {formatPeriod(month, year)}
                      </button>
                      <IconButton
                        label="Próximo mês"
                        icon={<FaChevronRight />}
                        onClick={() => movePeriod(1)}
                        disabled={loading}
                        className="border border-[var(--border)] bg-[var(--surface)]"
                      />
                    </div>
        
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(true)}
                      aria-label={activeFiltersCount > 0 ? `Filtros, ${activeFiltersCount} ativos` : 'Filtros'}
                      className="inline-flex min-h-11 sm:min-h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
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
        
              <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.88fr)_minmax(330px,1fr)]">
                <MovementTimeline
                  month={month}
                  year={year}
                  groups={timelineGroups}
                  order={timelineOrder}
                  onOrderChange={setTimelineOrder}
                  showValues={showValues}
                  loading={loading}
                  hasMore={visibleCount < sortedTransactions.length || hasMore}
                  onLoadMore={() => {
                    if (visibleCount < sortedTransactions.length) {
                      setTimelineWindow({
                        key: timelineContextKey,
                        count: visibleCount + TIMELINE_INCREMENT,
                      });
                      return;
                    }
                    loadMore();
                    setTimelineWindow({
                      key: timelineContextKey,
                      count: visibleCount + TIMELINE_INCREMENT,
                    });
                  }}
                  onOpen={setSelectedTransaction}
                />
        
                <aside className="grid content-start gap-[18px]">
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
        
        
      </div>
      )}

      {periodOpen && (
        <PeriodDialog
          month={month}
          year={year}
          loading={loading}
          onApply={applyPeriod}
          onClose={() => setPeriodOpen(false)}
        />
      )}

      {filtersOpen && (
        <FilterDialog
          fields={filtersWithRelations}
          values={refinementValues}
          loading={loading}
          total={total}
          onApply={applyRefinementFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {selectedTransaction && (
        <TransactionDetailLayer
          transaction={selectedTransaction}
          showValues={showValues}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </ProtectedRoute>
  );
}
