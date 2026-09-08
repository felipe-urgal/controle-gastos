'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import {
  FaArrowDown,
  FaArrowUp,
  FaBan,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaCopy,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaFileImport,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTag,
  FaTimes,
  FaWallet,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { Pagination } from '@/app/components/navigation';
import type { FilterField } from '@/app/components/navigation/dynamic-filters';
import { Button, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useTransactions } from '@/app/hooks/transactions/transaction-index';
import { statusConfig, transactionFilters } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { monthOptions, yearOptions } from '@/app/lib/date/constants';
import { canCompleteTransaction } from '@/app/lib/transactions/transaction-quick-actions';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import type { TransactionDTO, TransactionStatus } from '@/app/types/transaction';

type TransactionsView = 'inbox' | 'history';

type InboxGroup = {
  key: 'attention' | 'pending' | 'completed' | 'scheduled' | 'cancelled';
  title: string;
  description: string;
  items: TransactionDTO[];
};

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; type: 'INCOME' | 'EXPENSE' };

type PaginationProps = {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

type LaneProps = {
  group: InboxGroup;
  showValues: boolean;
  onChanged: () => Promise<void> | void;
  onOpen: (transaction: TransactionDTO) => void;
  onViewAll: (group: InboxGroup) => void;
};

const MAX_LANE_ITEMS = 3;
const REFINEMENT_FILTER_KEYS = new Set(['search', 'status', 'accountId', 'categoryId']);

function transactionDateKey(transaction: TransactionDTO) {
  return transaction.year * 10000 + transaction.month * 100 + transaction.day;
}

function todayDateKey() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function buildInboxGroups(transactions: TransactionDTO[]): InboxGroup[] {
  const today = todayDateKey();
  const attention: TransactionDTO[] = [];
  const pending: TransactionDTO[] = [];
  const completed: TransactionDTO[] = [];
  const scheduled: TransactionDTO[] = [];
  const cancelled: TransactionDTO[] = [];

  transactions.forEach((transaction) => {
    const date = transactionDateKey(transaction);

    if (transaction.status === 'PENDING') {
      if (date < today) attention.push(transaction);
      else if (date > today) scheduled.push(transaction);
      else pending.push(transaction);
      return;
    }

    if (transaction.status === 'COMPLETED') completed.push(transaction);
    else cancelled.push(transaction);
  });

  const newestFirst = (left: TransactionDTO, right: TransactionDTO) => transactionDateKey(right) - transactionDateKey(left);
  const oldestFirst = (left: TransactionDTO, right: TransactionDTO) => transactionDateKey(left) - transactionDateKey(right);

  return [
    {
      key: 'attention',
      title: 'Precisa atenção',
      description: 'Itens que precisam da sua ação',
      items: attention.sort(oldestFirst),
    },
    {
      key: 'pending',
      title: 'Pendentes',
      description: 'Aguardando conclusão',
      items: pending.sort(oldestFirst),
    },
    {
      key: 'completed',
      title: 'Concluídas recentes',
      description: 'Últimos lançamentos realizados',
      items: completed.sort(newestFirst),
    },
    {
      key: 'scheduled',
      title: 'Agendadas',
      description: 'Próximos compromissos',
      items: scheduled.sort(oldestFirst),
    },
    {
      key: 'cancelled',
      title: 'Canceladas',
      description: 'Mantidas no contexto',
      items: cancelled.sort(newestFirst),
    },
  ];
}

function useDesktopBreakpoint() {
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => setDesktop(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return desktop;
}

export default function OrbitTransactions() {
  const [activeView, setActiveView] = useState<TransactionsView>('inbox');
  const {
    loading,
    transactions,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasPagination,
    filters,
    setFilters,
    refetch,
  } = useTransactions({ pagination: activeView === 'history' });
  const { user } = useAuth();

  const showValues = user?.showValues !== false;
  const desktop = useDesktopBreakpoint();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDTO | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);
  const periodCloseRef = useRef<HTMLButtonElement>(null);

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
  const groups = useMemo(() => buildInboxGroups(transactions), [transactions]);
  const selectedHistory = transactions.find((transaction) => transaction.id === selectedHistoryId) ?? transactions[0] ?? null;
  const pagination = hasPagination && totalPages && totalPages > 1
    ? { page, pageSize, total, totalPages, onPageChange: setPage, onPageSizeChange: setPageSize }
    : undefined;
  const activeFiltersCount = Object.values(refinementValues).filter((value) => value !== undefined && value !== null && value !== '').length;

  function openHistory(transaction: TransactionDTO) {
    setSelectedHistoryId(transaction.id);
    if (!desktop) setSelectedTransaction(transaction);
  }

  function viewAll(group: InboxGroup) {
    const status: TransactionStatus = group.key === 'completed'
      ? 'COMPLETED'
      : group.key === 'cancelled'
        ? 'CANCELLED'
        : 'PENDING';

    setPage(1);
    setFilters((previous) => ({ ...previous, status }));
    setActiveView('history');
    setSelectedHistoryId(group.items[0]?.id ?? null);
  }

  function applyRefinementFilters(nextValues: Record<string, any>) {
    setFilters((previous) => ({
      month: previous.month,
      year: previous.year,
      ...nextValues,
    }));
  }

  function applyPeriod(month: number, year: number) {
    setFilters((previous) => ({
      ...previous,
      month: String(month),
      year: String(year),
    }));
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
          <p className="mt-1 hidden text-sm text-[var(--text-muted)] sm:block">Organize o que precisa de atenção e consulte o histórico completo quando quiser.</p>
        </div>
        <div className="hidden flex-wrap gap-2 sm:flex">
          <Link href="/transacoes/importar" className="inline-flex min-h-11 items-center gap-2 rounded-[11px] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaFileImport aria-hidden="true" /> Importar CSV/OFX</Link>
          <Link href="/transacoes/nova" className="inline-flex min-h-11 items-center gap-2 rounded-[11px] border border-[var(--orbit-primary)]/45 bg-[var(--orbit-primary)] px-3.5 text-sm font-bold text-white transition-colors hover:bg-[var(--orbit-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaPlus aria-hidden="true" /> Nova transação</Link>
        </div>
      </header>

      <section className="my-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" aria-label="Modos de visualização e contexto">
        <div className="grid grid-cols-2 rounded-[13px] border border-[var(--border)] bg-[var(--surface-subtle)] p-1 md:inline-flex" role="tablist" aria-label="Visão das transações">
          {(['inbox', 'history'] as const).map((view) => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={activeView === view}
              onClick={() => setActiveView(view)}
              className={`min-h-10 rounded-[9px] px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${activeView === view ? 'border border-[var(--orbit-primary)]/55 bg-[var(--primary-subtle)] text-[var(--orbit-primary)]' : 'border border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
            >
              {view === 'inbox' ? 'Inbox' : 'Histórico'}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ContextChips
            filters={filters}
            accounts={accounts}
            categories={categories}
            periodOpen={periodOpen}
            onPeriodClick={() => setPeriodOpen(true)}
          />
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaFilter aria-hidden="true" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[var(--orbit-primary)] px-1.5 text-xs font-bold text-white">{activeFiltersCount}</span>
            )}
          </button>
        </div>
      </section>

      {activeView === 'inbox' && <InboxSummary groups={groups} loading={loading} />}

      <div className={activeView === 'inbox' ? 'mt-3 md:mt-4' : ''}>
        {activeView === 'inbox' ? (
          <InboxBoard
            groups={groups}
            loading={loading}
            showValues={showValues}
            onChanged={() => refetch({ silent: true })}
            onOpen={setSelectedTransaction}
            onViewAll={viewAll}
          />
        ) : (
          <HistoryWorkspace
            transactions={transactions}
            loading={loading}
            selected={selectedHistory}
            searchTerm={filters.search ?? ''}
            pagination={pagination}
            showValues={showValues}
            onOpen={openHistory}
            onSearchChange={(search) => setFilters((previous) => ({ ...previous, search }))}
          />
        )}
      </div>

      <Link href="/transacoes/nova" aria-label="Nova transação" className="fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[var(--orbit-primary)] text-xl text-white shadow-[var(--shadow-surface)] sm:hidden" style={{ bottom: 'calc(var(--app-mobile-bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)' }}><FaPlus aria-hidden="true" /></Link>

      {periodOpen && (
        <PeriodDialog
          closeRef={periodCloseRef}
          month={Number(filters.month)}
          year={Number(filters.year)}
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
          total={activeView === 'inbox' ? transactions.length : total}
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

function ContextChips({ filters, accounts, categories, periodOpen, onPeriodClick }: { filters: Record<string, any>; accounts: AccountOption[]; categories: CategoryOption[]; periodOpen: boolean; onPeriodClick: () => void }) {
  const period = formatPeriod(filters.month, filters.year) ?? 'Selecionar período';
  const status = filters.status ? statusConfig[filters.status as keyof typeof statusConfig]?.label : null;
  const account = filters.accountId ? accounts.find((item) => item.id === filters.accountId)?.name : null;
  const category = filters.categoryId ? categories.find((item) => item.id === filters.categoryId)?.name : null;

  return (
    <>
      <button
        type="button"
        onClick={onPeriodClick}
        aria-haspopup="dialog"
        aria-expanded={periodOpen}
        className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <FaCalendarAlt aria-hidden="true" /> {period}
      </button>
      {status && <span className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--income)]/30 bg-[var(--primary-subtle)] px-3 text-sm font-semibold text-[var(--income)]"><FaCheck aria-hidden="true" /> {status}</span>}
      {account && <span className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--orbit-primary)]/35 bg-[var(--surface-raised)] px-3 text-sm font-semibold text-[var(--orbit-primary)]"><FaWallet aria-hidden="true" /> {account}</span>}
      {category && <span className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-muted)]"><FaTag aria-hidden="true" /> {category}</span>}
      {filters.search && <span className="inline-flex min-h-9 max-w-56 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-muted)]"><FaSearch aria-hidden="true" /><span className="truncate">{filters.search}</span></span>}
    </>
  );
}

function InboxSummary({ groups, loading }: { groups: InboxGroup[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="hidden gap-2 md:grid md:grid-cols-5" role="status" aria-label="Carregando resumo da Inbox">
        {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-[94px] animate-pulse rounded-[15px] border border-[var(--border)] bg-[var(--skeleton)]" />)}
      </div>
    );
  }

  return (
    <section aria-label="Resumo da Inbox" className="hidden md:grid md:grid-cols-5 md:gap-2.5">
      {groups.map((group) => (
        <article key={group.key} className={`min-h-[94px] rounded-[15px] border p-3.5 ${summaryTone(group.key)}`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"><GroupIcon groupKey={group.key} /> <span className="truncate">{group.title}</span></div>
          <p className="mt-2 text-2xl font-bold tracking-tight">{group.items.length}</p>
          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{group.description}</p>
        </article>
      ))}
    </section>
  );
}

function InboxBoard({ groups, loading, showValues, onChanged, onOpen, onViewAll }: { groups: InboxGroup[]; loading: boolean; showValues: boolean; onChanged: () => Promise<void> | void; onOpen: (transaction: TransactionDTO) => void; onViewAll: (group: InboxGroup) => void }) {
  const [expandedGroup, setExpandedGroup] = useState<InboxGroup['key'] | null>(null);
  const hasItems = groups.some((group) => group.items.length > 0);

  useEffect(() => {
    if (loading || !hasItems) return;

    setExpandedGroup((current) => {
      if (current && groups.some((group) => group.key === current && group.items.length > 0)) return current;
      return groups.find((group) => group.items.length > 0)?.key ?? null;
    });
  }, [groups, hasItems, loading]);

  if (loading) return <PageLoading type="list" />;
  if (!hasItems) return <PageEmpty title="Nenhuma transação encontrada" />;

  return (
    <section aria-label="Inbox Financeira">
      <div className="hidden items-start gap-3 overflow-x-auto pb-2 md:flex">
        {groups.map((group) => (
          <DesktopLane
            key={group.key}
            group={group}
            showValues={showValues}
            onChanged={onChanged}
            onOpen={onOpen}
            onViewAll={onViewAll}
          />
        ))}
      </div>
      <div className="grid gap-2 md:hidden">
        {groups.map((group) => (
          <MobileLane
            key={group.key}
            group={group}
            expanded={expandedGroup === group.key}
            showValues={showValues}
            onChanged={onChanged}
            onOpen={onOpen}
            onViewAll={onViewAll}
            onToggle={() => setExpandedGroup((previous) => previous === group.key ? null : group.key)}
          />
        ))}
      </div>
    </section>
  );
}

function LaneHeader({ group, mobile = false }: { group: InboxGroup; mobile?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${groupIconTone(group.key)}`}><GroupIcon groupKey={group.key} /></span>{group.title}</h2>
        <p className={`mt-1 truncate text-[var(--text-muted)] ${mobile ? 'text-xs' : 'text-sm'}`}>{group.description}</p>
      </div>
      <span className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] px-1.5 text-xs font-bold text-[var(--text-muted)]">{group.items.length}</span>
    </div>
  );
}

function DesktopLane({ group, showValues, onChanged, onOpen, onViewAll }: LaneProps) {
  const visibleItems = group.items.slice(0, MAX_LANE_ITEMS);

  return (
    <article className={`min-h-[485px] min-w-[215px] flex-1 basis-[215px] rounded-[16px] border p-3 ${laneTone(group.key)}`}>
      <LaneHeader group={group} />
      <div className="mt-3 grid gap-2">
        {visibleItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-sm text-[var(--text-muted)]">Nada nesta seção.</p>
        ) : (
          visibleItems.map((transaction) => (
            <CompactTransactionCard key={transaction.id} transaction={transaction} showValues={showValues} onChanged={onChanged} onOpen={onOpen} />
          ))
        )}
      </div>
      {group.items.length > MAX_LANE_ITEMS && (
        <button type="button" onClick={() => onViewAll(group)} className="mt-2 min-h-10 w-full rounded-lg px-2 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Ver todos ({group.items.length}) →</button>
      )}
    </article>
  );
}

function MobileLane({ group, expanded, showValues, onChanged, onOpen, onViewAll, onToggle }: LaneProps & { expanded: boolean; onToggle: () => void }) {
  const visibleItems = group.items.slice(0, MAX_LANE_ITEMS);

  return (
    <article className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="block min-h-14 w-full p-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]"
      >
        <LaneHeader group={group} mobile />
      </button>
      {expanded && (
        <div className="grid gap-2 border-t border-[var(--border)] p-2.5">
          {visibleItems.length === 0 ? (
            <p className="p-2 text-sm text-[var(--text-muted)]">Nada nesta seção.</p>
          ) : (
            visibleItems.map((transaction) => (
              <CompactTransactionCard key={transaction.id} transaction={transaction} showValues={showValues} onChanged={onChanged} onOpen={onOpen} />
            ))
          )}
          {group.items.length > MAX_LANE_ITEMS && (
            <button type="button" onClick={() => onViewAll(group)} className="min-h-10 rounded-lg px-2 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Ver todos ({group.items.length}) →</button>
          )}
        </div>
      )}
    </article>
  );
}

function CompactTransactionCard({ transaction, showValues, onChanged, onOpen }: { transaction: TransactionDTO; showValues: boolean; onChanged: () => Promise<void> | void; onOpen: (transaction: TransactionDTO) => void }) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canComplete = canCompleteTransaction(transaction.status);

  async function handleComplete() {
    if (isCompleting) return;
    setIsCompleting(true);
    setError(null);

    try {
      await transactionService.complete(transaction.id);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível concluir a transação.');
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]">
      <button type="button" onClick={() => onOpen(transaction)} className="block w-full p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]" aria-label={`Abrir detalhe contextual da transação ${transaction.description}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</span>
          <span className="shrink-0 text-xs text-[var(--text-muted)]">{formatInboxDate(transaction)}</span>
        </div>
        <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{transaction.category?.name ?? 'Sem categoria'} · {transaction.account?.name ?? 'Sem conta'}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <StatusPill status={transaction.status} />
          <span className={`text-sm font-bold ${transaction.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>{formatTransactionAmount(transaction, showValues)}</span>
        </div>
      </button>
      {canComplete && (
        <div className="border-t border-[var(--border)] px-2 py-1.5">
          <button type="button" onClick={handleComplete} disabled={isCompleting} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-[var(--income)] hover:bg-[var(--primary-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-60"><FaCheck aria-hidden="true" /> {isCompleting ? 'Concluindo…' : 'Concluir'}</button>
        </div>
      )}
      {error && <p role="alert" className="border-t border-[var(--border)] px-3 py-2 text-sm text-[var(--expense)]">{error}</p>}
    </article>
  );
}

function HistoryWorkspace({ transactions, loading, selected, searchTerm, pagination, showValues, onOpen, onSearchChange }: { transactions: TransactionDTO[]; loading: boolean; selected: TransactionDTO | null; searchTerm: string; pagination?: PaginationProps; showValues: boolean; onOpen: (transaction: TransactionDTO) => void; onSearchChange: (search: string) => void }) {
  const groups = groupHistoryByDate(transactions);

  return (
    <section aria-labelledby="transactions-history-title">
      <div className="mb-3 flex flex-col gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Input value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar descrição, categoria ou conta..." aria-label="Buscar no histórico" icon={<FaSearch />} disabled={loading} />
        </div>
        <span className="shrink-0 text-sm text-[var(--text-muted)]" role="status">{loading ? 'Carregando…' : `${transactions.length} nesta página`}</span>
      </div>

      {loading ? <PageLoading type="list" /> : transactions.length === 0 ? <PageEmpty title="Nenhuma transação encontrada" /> : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)]">
            <h2 id="transactions-history-title" className="sr-only">Histórico</h2>
            {groups.map(({ label, items }) => (
              <section key={label} aria-label={label}>
                <h3 className="border-t border-[var(--border)] px-4 pb-2 pt-3 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] first:border-t-0">{label}</h3>
                {items.map((transaction) => (
                  <HistoryRow key={transaction.id} transaction={transaction} selected={selected?.id === transaction.id} showValues={showValues} onOpen={onOpen} />
                ))}
              </section>
            ))}
          </div>
          <aside className="hidden max-h-[calc(100vh-120px)] overflow-y-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface)] lg:sticky lg:top-4 lg:block" aria-label="Detalhe da transação selecionada">
            {selected ? <OrbitTransactionDetail transaction={selected} showValues={showValues} compact /> : <p className="p-4 text-sm text-[var(--text-muted)]">Selecione uma transação.</p>}
          </aside>
        </div>
      )}

      {pagination && <div className="mt-4"><Pagination {...pagination} loading={loading} /></div>}
    </section>
  );
}

function HistoryRow({ transaction, selected, showValues, onOpen }: { transaction: TransactionDTO; selected: boolean; showValues: boolean; onOpen: (transaction: TransactionDTO) => void }) {
  const isIncome = transaction.type === 'INCOME';

  return (
    <button type="button" onClick={() => onOpen(transaction)} className={`grid min-h-[66px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--border)] px-4 py-2.5 text-left transition-colors first:border-t-0 hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] md:grid-cols-[minmax(0,1.4fr)_minmax(110px,.7fr)_auto_auto] ${selected ? 'bg-[var(--primary-subtle)]' : ''}`}>
      <span className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[11px] ${isIncome ? 'bg-[var(--primary-subtle)] text-[var(--income)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`} aria-hidden="true">{isIncome ? <FaArrowUp /> : <FaArrowDown />}</span>
        <span className="min-w-0"><span className="block truncate text-sm font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</span><span className="mt-0.5 block truncate text-sm text-[var(--text-muted)]">{transaction.category?.name ?? 'Sem categoria'} · {transaction.account?.name ?? 'Sem conta'}</span></span>
      </span>
      <span className="hidden truncate text-sm text-[var(--text-muted)] md:block">{transaction.account?.name ?? '—'}</span>
      <span className="hidden md:inline-flex"><StatusPill status={transaction.status} /></span>
      <span className={`text-right text-sm font-bold ${isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>{formatTransactionAmount(transaction, showValues)}</span>
    </button>
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
  const date = new Date(transaction.year, transaction.month - 1, transaction.day);

  return (
    <div className={compact ? 'p-4' : 'p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]'}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] ${isIncome ? 'bg-[var(--primary-subtle)] text-[var(--income)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`} aria-hidden="true">{isIncome ? <FaArrowUp /> : <FaArrowDown />}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{isIncome ? 'Receita' : 'Despesa'}</p>
        </div>
      </div>

      <p className={`mt-5 break-words text-3xl font-bold tracking-tight ${isIncome ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>{formatTransactionAmount(transaction, showValues)}</p>
      <div className="mt-2"><StatusPill status={transaction.status} /></div>

      <dl className="mt-5 overflow-hidden rounded-[13px] border border-[var(--border)]">
        <DetailRow label="Data">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date)}</DetailRow>
        <DetailRow label="Conta">{transaction.account?.name ?? '—'}{transaction.account?.currency ? ` · ${transaction.account.currency}` : ''}</DetailRow>
        <DetailRow label="Categoria">{transaction.category?.name ?? '—'}</DetailRow>
        <DetailRow label="Status">{statusConfig[transaction.status as keyof typeof statusConfig]?.label ?? transaction.status}</DetailRow>
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        <Link href={`/transacoes/alterar/${transaction.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Editar</Link>
        <Link href={`/transacoes/nova?duplicate=${encodeURIComponent(transaction.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaCopy aria-hidden="true" /> Duplicar</Link>
        <Link href={`/transacoes/show/${transaction.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaExternalLinkAlt aria-hidden="true" /> Detalhes</Link>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
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

function GroupIcon({ groupKey }: { groupKey: InboxGroup['key'] }) {
  if (groupKey === 'attention') return <FaExclamationCircle aria-hidden="true" />;
  if (groupKey === 'pending') return <FaClock aria-hidden="true" />;
  if (groupKey === 'completed') return <FaCheckCircle aria-hidden="true" />;
  if (groupKey === 'scheduled') return <FaCalendarAlt aria-hidden="true" />;
  return <FaBan aria-hidden="true" />;
}

function summaryTone(key: InboxGroup['key']) {
  if (key === 'attention') return 'border-[var(--expense)]/35 bg-[var(--danger-subtle)] text-[var(--expense)]';
  if (key === 'pending') return 'border-[var(--warning)]/35 bg-[var(--warning-subtle)] text-[var(--pending)]';
  if (key === 'completed') return 'border-[var(--income)]/30 bg-[var(--primary-subtle)] text-[var(--income)]';
  if (key === 'scheduled') return 'border-[var(--orbit-primary)]/35 bg-[var(--surface-raised)] text-[var(--orbit-primary)]';
  return 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]';
}

function groupIconTone(key: InboxGroup['key']) {
  if (key === 'attention') return 'bg-[var(--danger-subtle)] text-[var(--expense)]';
  if (key === 'pending') return 'bg-[var(--warning-subtle)] text-[var(--pending)]';
  if (key === 'completed') return 'bg-[var(--primary-subtle)] text-[var(--income)]';
  if (key === 'scheduled') return 'bg-[var(--surface-raised)] text-[var(--orbit-primary)]';
  return 'bg-[var(--surface-subtle)] text-[var(--text-muted)]';
}

function laneTone(key: InboxGroup['key']) {
  if (key === 'attention') return 'border-[var(--expense)]/30 bg-[var(--danger-subtle)]/35';
  if (key === 'pending') return 'border-[var(--warning)]/30 bg-[var(--warning-subtle)]/30';
  if (key === 'completed') return 'border-[var(--income)]/25 bg-[var(--surface)]';
  if (key === 'scheduled') return 'border-[var(--orbit-primary)]/25 bg-[var(--surface-raised)]';
  return 'border-[var(--border)] bg-[var(--surface)]';
}

function formatInboxDate(transaction: TransactionDTO) {
  const key = transactionDateKey(transaction);
  const today = todayDateKey();
  if (key === today) return 'Hoje';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.getFullYear() * 10000 + (yesterday.getMonth() + 1) * 100 + yesterday.getDate();
  if (key === yesterdayKey) return 'Ontem';

  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(new Date(transaction.year, transaction.month - 1, transaction.day))
    .replace('.', '');
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

function groupHistoryByDate(transactions: TransactionDTO[]) {
  const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const result: { label: string; items: TransactionDTO[] }[] = [];

  transactions.forEach((transaction) => {
    const label = formatter.format(new Date(transaction.year, transaction.month - 1, transaction.day));
    const current = result[result.length - 1];
    if (current?.label === label) current.items.push(transaction);
    else result.push({ label, items: [transaction] });
  });

  return result;
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
