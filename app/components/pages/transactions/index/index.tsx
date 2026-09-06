'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import {
  FaCalendarAlt,
  FaCheck,
  FaFileImport,
  FaFilter,
  FaPlus,
  FaTimes,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { Pagination } from '@/app/components/navigation';
import { TransactionInfo } from '@/app/components/pages/transactions';
import { Button, Input, Select } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { useTransactions } from '@/app/hooks/transactions/transaction-index';
import { statusOptions } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { monthNames, monthOptions, yearOptions } from '@/app/lib/date/constants';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import type { TransactionDTO } from '@/app/types/transaction';

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

type TransactionsView = 'inbox' | 'history';
type InboxTone = 'attention' | 'pending' | 'cancelled' | 'completed' | 'scheduled';

type InboxGroup = {
  key: InboxTone;
  title: string;
  description: string;
  icon: string;
  items: TransactionDTO[];
};

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
  const scheduled: TransactionDTO[] = [];
  const completed: TransactionDTO[] = [];
  const cancelled: TransactionDTO[] = [];

  for (const transaction of transactions) {
    const date = transactionDateKey(transaction);

    if (transaction.status === 'PENDING') {
      if (date < today) attention.push(transaction);
      else if (date > today) scheduled.push(transaction);
      else pending.push(transaction);
      continue;
    }

    if (transaction.status === 'COMPLETED') {
      completed.push(transaction);
      continue;
    }

    cancelled.push(transaction);
  }

  const newestFirst = (a: TransactionDTO, b: TransactionDTO) =>
    transactionDateKey(b) - transactionDateKey(a);
  const oldestFirst = (a: TransactionDTO, b: TransactionDTO) =>
    transactionDateKey(a) - transactionDateKey(b);

  return [
    {
      key: 'attention',
      title: 'Precisa atenção',
      description: 'Itens que precisam da sua ação',
      icon: '◉',
      items: attention.sort(oldestFirst),
    },
    {
      key: 'pending',
      title: 'Pendentes',
      description: 'Aguardando conclusão',
      icon: '◷',
      items: pending.sort(oldestFirst),
    },
    {
      key: 'cancelled',
      title: 'Canceladas',
      description: 'Mantidas no recorte para não perder contexto',
      icon: '×',
      items: cancelled.sort(newestFirst),
    },
    {
      key: 'completed',
      title: 'Concluídas',
      description: 'Movimentações realizadas no recorte',
      icon: '✓',
      items: completed.sort(newestFirst),
    },
    {
      key: 'scheduled',
      title: 'Agendadas',
      description: 'Pendências futuras do recorte atual',
      icon: '▦',
      items: scheduled.sort(oldestFirst),
    },
  ];
}

function signedAmount(transaction: TransactionDTO, showValues: boolean) {
  if (!showValues) return '••••';
  const amount = formatCurrency(transaction.amount, transaction.account.currency);
  return `${transaction.type === 'INCOME' ? '+' : '-'}${amount}`;
}

function groupAmountLines(items: TransactionDTO[], showValues: boolean) {
  if (!showValues) return ['••••'];
  if (items.length === 0) return ['—'];

  const totals = new Map<string, number>();
  for (const transaction of items) {
    const currency = transaction.account.currency;
    const signed = transaction.type === 'INCOME' ? transaction.amount : -transaction.amount;
    totals.set(currency, (totals.get(currency) ?? 0) + signed);
  }

  return Array.from(totals.entries()).map(([currency, value]) => {
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${prefix}${formatCurrency(Math.abs(value), currency)}`;
  });
}

function laneTone(key: InboxTone) {
  switch (key) {
    case 'attention':
      return {
        border: 'border-[var(--expense)]/35',
        surface: 'bg-[var(--danger-subtle)]/30',
        text: 'text-[var(--expense)]',
      };
    case 'pending':
      return {
        border: 'border-[var(--warning)]/35',
        surface: 'bg-[var(--warning-subtle)]/25',
        text: 'text-[var(--warning)]',
      };
    case 'completed':
      return {
        border: 'border-[var(--income)]/30',
        surface: 'bg-[var(--primary-subtle)]/20',
        text: 'text-[var(--income)]',
      };
    case 'scheduled':
      return {
        border: 'border-[var(--orbit-primary)]/35',
        surface: 'bg-[var(--primary-subtle)]/30',
        text: 'text-[var(--orbit-primary)]',
      };
    default:
      return {
        border: 'border-[var(--border)]',
        surface: 'bg-[var(--surface)]',
        text: 'text-[var(--text-muted)]',
      };
  }
}

export default function Index() {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
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
    clearFilters,
    refetch,
  } = useTransactions();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeView, setActiveView] = useState<TransactionsView>('inbox');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDTO | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function fetchRelations() {
      try {
        const [accountsResponse, categoriesResponse] = await Promise.all([
          accountService.getAll(),
          categoryService.getAll(),
        ]);

        setAccounts(accountsResponse.data?.items || []);
        setCategories(categoriesResponse.data?.items || []);
      } catch (error) {
        console.error('Erro ao carregar relações:', error);
      }
    }

    fetchRelations();
  }, []);

  useEffect(() => {
    if (transactions.length === 0) {
      setSelectedHistoryId(null);
      return;
    }

    if (!selectedHistoryId || !transactions.some((transaction) => transaction.id === selectedHistoryId)) {
      setSelectedHistoryId(transactions[0].id);
    }
  }, [selectedHistoryId, transactions]);

  useEffect(() => {
    if (!selectedTransaction) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => detailCloseRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setSelectedTransaction(null);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previousFocus?.focus());
    };
  }, [selectedTransaction]);

  useEffect(() => {
    if (!filtersOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => filterCloseRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setFiltersOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previousFocus?.focus());
    };
  }, [filtersOpen]);

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

  const inboxGroups = useMemo(() => buildInboxGroups(transactions), [transactions]);
  const selectedHistoryTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === selectedHistoryId) ?? transactions[0] ?? null,
    [selectedHistoryId, transactions],
  );

  const historyGroups = useMemo(() => {
    const grouped = new Map<string, TransactionDTO[]>();
    for (const transaction of transactions) {
      const label = new Date(transaction.year, transaction.month - 1, transaction.day).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      });
      grouped.set(label, [...(grouped.get(label) ?? []), transaction]);
    }
    return Array.from(grouped.entries());
  }, [transactions]);

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== null && value !== '',
  ).length;

  const periodLabel = useMemo(() => {
    const month = Number(filters.month);
    const year = Number(filters.year);
    if (month >= 1 && month <= 12 && year) return `${monthNames[month - 1]} / ${year}`;
    if (month >= 1 && month <= 12) return monthNames[month - 1];
    if (year) return String(year);
    return 'Todos os períodos';
  }, [filters.month, filters.year]);

  const statusLabel =
    statusOptions.find((option) => option.value === filters.status)?.label ?? 'Todos os status';
  const accountLabel =
    accounts.find((account) => account.id === filters.accountId)?.name ?? 'Todas as contas';

  const pagination =
    hasPagination && totalPages && totalPages > 1
      ? {
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }
      : undefined;

  function updateFilter(key: string, value: unknown) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  function handleHistoryOpen(transaction: TransactionDTO) {
    setSelectedHistoryId(transaction.id);
    if (window.matchMedia('(max-width: 1023px)').matches) setSelectedTransaction(transaction);
  }

  return (
    <ProtectedRoute>
      <header className="mb-[22px] flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="mb-1.5 hidden text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--orbit-primary)] sm:block">
            Orbit / Centro operacional
          </p>
          <h1 className="text-[23px] font-bold tracking-tight text-[var(--foreground)] sm:text-[30px]">
            Transações
          </h1>
          <p className="mt-1 hidden max-w-2xl text-sm text-[var(--text-muted)] sm:block">
            Organize o que precisa de atenção e consulte o histórico completo quando quiser.
          </p>
        </div>

        <div className="hidden flex-wrap justify-end gap-2 sm:flex">
          <Button as="a" href="/transacoes/importar" variant="outline" icon={<FaFileImport />}>
            Importar CSV/OFX
          </Button>
          <Button as="a" href="/transacoes/nova" icon={<FaPlus />}>
            Nova transação
          </Button>
        </div>
      </header>

      <section className="mb-[18px] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" aria-label="Modos de visualização e contexto">
        <div
          className="grid w-full grid-cols-2 rounded-[13px] border border-[var(--border)] bg-[var(--surface)] p-1 lg:inline-flex lg:w-auto"
          role="tablist"
          aria-label="Visualização"
        >
          {(['inbox', 'history'] as TransactionsView[]).map((view) => {
            const active = activeView === view;
            return (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveView(view)}
                className={`min-h-9 rounded-[9px] px-4 text-sm font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
                  active
                    ? 'border border-[var(--orbit-primary)]/35 bg-[var(--primary-subtle)] text-[var(--orbit-primary)]'
                    : 'border border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {view === 'inbox' ? 'Inbox' : 'Histórico'}
              </button>
            );
          })}
        </div>

        <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="inline-flex min-h-[34px] shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-muted)]">
            <FaCalendarAlt aria-hidden="true" /> {periodLabel}
          </span>
          <span className="inline-flex min-h-[34px] shrink-0 items-center rounded-full border border-[var(--income)]/30 bg-[var(--primary-subtle)] px-3 text-sm font-semibold text-[var(--income)]">
            {statusLabel}
          </span>
          <span className="inline-flex min-h-[34px] shrink-0 items-center rounded-full border border-[var(--orbit-primary)]/30 bg-[var(--primary-subtle)] px-3 text-sm font-semibold text-[var(--orbit-primary)]">
            {accountLabel}
          </span>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex min-h-[34px] shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaFilter aria-hidden="true" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--surface-raised)] px-1.5 text-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </section>

      <InboxSummary groups={inboxGroups} showValues={showValues} loading={loading} />

      {activeView === 'inbox' ? (
        <TransactionsInbox
          groups={inboxGroups}
          loading={loading}
          pagination={pagination}
          showValues={showValues}
          onChanged={() => refetch({ silent: true })}
          onOpen={setSelectedTransaction}
        />
      ) : (
        <TransactionsHistory
          groups={historyGroups}
          loading={loading}
          selected={selectedHistoryTransaction}
          showValues={showValues}
          pagination={pagination}
          onOpen={handleHistoryOpen}
        />
      )}

      <Link
        href="/transacoes/nova"
        aria-label="Nova transação"
        className="fixed right-[18px] z-30 grid h-[54px] w-[54px] place-items-center rounded-full bg-[var(--orbit-primary)] text-2xl text-white shadow-[var(--shadow-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:hidden"
        style={{ bottom: 'calc(var(--app-mobile-bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)' }}
      >
        <FaPlus aria-hidden="true" />
      </Link>

      {filtersOpen && (
        <TransactionFiltersLayer
          closeRef={filterCloseRef}
          values={filters}
          accountOptions={accountOptions}
          categoryOptions={categoryOptions}
          loading={loading}
          onChange={updateFilter}
          onClear={clearFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {selectedTransaction && (
        <TransactionDetailLayer
          transaction={selectedTransaction}
          closeRef={detailCloseRef}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </ProtectedRoute>
  );
}

function InboxSummary({
  groups,
  showValues,
  loading,
}: {
  groups: InboxGroup[];
  showValues: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-[18px] grid grid-cols-2 gap-2 lg:grid-cols-5" role="status" aria-label="Carregando resumo da Inbox">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-[94px] animate-pulse rounded-[15px] border border-[var(--border)] bg-[var(--skeleton)]" />
        ))}
      </div>
    );
  }

  return (
    <section className="mb-[18px] grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-[10px]" aria-label="Resumo da Inbox">
      {groups.map((group, index) => {
        const tone = laneTone(group.key);
        const amounts = groupAmountLines(group.items, showValues);
        return (
          <article
            key={group.key}
            className={`min-h-[76px] rounded-[15px] border p-3 sm:min-h-[94px] sm:p-[14px] ${tone.border} ${tone.surface} ${
              index === groups.length - 1 ? 'col-span-2 lg:col-span-1' : ''
            }`}
          >
            <p className="flex items-center gap-2 text-xs font-extrabold text-[var(--text-muted)]">
              <span className={tone.text} aria-hidden="true">{group.icon}</span>
              {group.title}
            </p>
            <p className={`mt-2 text-xl font-black tracking-tight sm:text-2xl ${tone.text}`}>{group.items.length}</p>
            <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-[var(--text-muted)]">
              {amounts.map((amount) => <span key={amount}>{amount}</span>)}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function TransactionsInbox({
  groups,
  loading,
  pagination,
  showValues,
  onChanged,
  onOpen,
}: {
  groups: InboxGroup[];
  loading: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total?: number;
    totalPages?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  showValues: boolean;
  onChanged: () => Promise<void> | void;
  onOpen: (transaction: TransactionDTO) => void;
}) {
  const hasItems = groups.some((group) => group.items.length > 0);

  if (loading) return <PageLoading type="list" />;
  if (!hasItems) return <PageEmpty title="Nenhuma transação encontrada" />;

  return (
    <section aria-label="Inbox financeira">
      <div className="grid gap-2.5 md:grid-flow-col md:auto-cols-[minmax(215px,1fr)] md:items-start md:overflow-x-auto md:pb-2 xl:grid-flow-row xl:grid-cols-5 xl:gap-3 xl:overflow-visible">
        {groups.map((group) => (
          <InboxGroupCard
            key={group.key}
            group={group}
            showValues={showValues}
            onChanged={onChanged}
            onOpen={onOpen}
          />
        ))}
      </div>

      {pagination && (
        <div className="mt-4">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            loading={loading}
          />
        </div>
      )}
    </section>
  );
}

function InboxGroupCard({
  group,
  showValues,
  onChanged,
  onOpen,
}: {
  group: InboxGroup;
  showValues: boolean;
  onChanged: () => Promise<void> | void;
  onOpen: (transaction: TransactionDTO) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(group.key === 'attention');
  const tone = laneTone(group.key);

  return (
    <article className={`min-w-0 overflow-hidden rounded-2xl border md:min-h-[485px] ${tone.border} ${tone.surface}`}>
      <button
        type="button"
        onClick={() => setMobileOpen((previous) => !previous)}
        aria-expanded={mobileOpen}
        className="flex min-h-[54px] w-full items-center justify-between gap-2 px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] md:pointer-events-none md:items-start"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--foreground)]">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--surface-raised)] ${tone.text}`} aria-hidden="true">
              {group.icon}
            </span>
            <span>{group.title}</span>
          </div>
          <p className="mt-1 hidden text-[11px] text-[var(--text-muted)] md:block">{group.description}</p>
        </div>
        <span className="inline-flex min-h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] px-1.5 text-xs font-black text-[var(--foreground)]">
          {group.items.length}
        </span>
      </button>

      <div className={`${mobileOpen ? 'grid' : 'hidden'} gap-2 px-2.5 pb-2.5 md:grid`}>
        {group.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-sm text-[var(--text-muted)]">
            Nada nesta seção.
          </p>
        ) : (
          group.items.map((transaction) => (
            <CompactTransactionCard
              key={transaction.id}
              transaction={transaction}
              showValues={showValues}
              onChanged={onChanged}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </article>
  );
}

function CompactTransactionCard({
  transaction,
  showValues,
  onChanged,
  onOpen,
}: {
  transaction: TransactionDTO;
  showValues: boolean;
  onChanged: () => Promise<void> | void;
  onOpen: (transaction: TransactionDTO) => void;
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const canComplete = transaction.status === 'PENDING';

  async function complete() {
    if (!canComplete || isCompleting) return;
    setIsCompleting(true);
    setFeedback(null);
    try {
      await transactionService.complete(transaction.id);
      await onChanged();
    } catch {
      setFeedback('Não foi possível concluir.');
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] transition-colors hover:border-[var(--border-strong)]">
      <button
        type="button"
        onClick={() => onOpen(transaction)}
        className="w-full p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words text-sm font-black leading-tight text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p>
            <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{transaction.account.name}</p>
          </div>
          <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{String(transaction.day).padStart(2, '0')}/{String(transaction.month).padStart(2, '0')}</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="truncate text-[10px] text-[var(--text-muted)]">{transaction.category.name}</span>
          <strong className={`shrink-0 text-sm ${transaction.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
            {signedAmount(transaction, showValues)}
          </strong>
        </div>
      </button>

      {canComplete && (
        <div className="border-t border-[var(--border)] px-2.5 py-2">
          <button
            type="button"
            onClick={complete}
            disabled={isCompleting}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--warning)]/35 bg-[var(--warning-subtle)] px-2.5 text-xs font-extrabold text-[var(--warning)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-60"
          >
            <FaCheck aria-hidden="true" /> {isCompleting ? 'Concluindo…' : 'Concluir'}
          </button>
          {feedback && <span className="ml-2 text-xs text-[var(--expense)]" role="alert">{feedback}</span>}
        </div>
      )}
    </article>
  );
}

function TransactionsHistory({
  groups,
  loading,
  selected,
  showValues,
  pagination,
  onOpen,
}: {
  groups: [string, TransactionDTO[]][];
  loading: boolean;
  selected: TransactionDTO | null;
  showValues: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total?: number;
    totalPages?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  onOpen: (transaction: TransactionDTO) => void;
}) {
  if (loading) return <PageLoading type="list" />;
  if (groups.length === 0) return <PageEmpty title="Nenhuma transação encontrada" />;

  return (
    <section className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]" aria-label="Histórico de transações">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {groups.map(([label, transactions]) => (
          <section key={label}>
            <h2 className="px-3.5 pb-1 pt-3 text-[11px] font-black uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</h2>
            {transactions.map((transaction) => (
              <HistoryRow
                key={transaction.id}
                transaction={transaction}
                selected={selected?.id === transaction.id}
                showValues={showValues}
                onOpen={onOpen}
              />
            ))}
          </section>
        ))}

        {pagination && (
          <div className="border-t border-[var(--border)] p-3">
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={pagination.onPageChange}
              onPageSizeChange={pagination.onPageSizeChange}
              loading={loading}
            />
          </div>
        )}
      </div>

      {selected && (
        <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] overflow-y-auto lg:block" aria-label={`Detalhe de ${selected.description}`}>
          <TransactionInfo transaction={selected} />
        </aside>
      )}
    </section>
  );
}

function HistoryRow({
  transaction,
  selected,
  showValues,
  onOpen,
}: {
  transaction: TransactionDTO;
  selected: boolean;
  showValues: boolean;
  onOpen: (transaction: TransactionDTO) => void;
}) {
  const statusLabel = statusOptions.find((option) => option.value === transaction.status)?.label ?? transaction.status;

  return (
    <button
      type="button"
      onClick={() => onOpen(transaction)}
      className={`grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--border)] px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] md:grid-cols-[minmax(0,1.5fr)_minmax(110px,.8fr)_100px_105px] ${selected ? 'bg-[var(--primary-subtle)]' : ''}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{transaction.category.name}</p>
      </div>
      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm text-[var(--foreground)]">{transaction.account.name}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{String(transaction.day).padStart(2, '0')}/{String(transaction.month).padStart(2, '0')}/{transaction.year}</p>
      </div>
      <span className="hidden w-fit rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] md:inline-flex">{statusLabel}</span>
      <strong className={`whitespace-nowrap text-right text-sm ${transaction.type === 'INCOME' ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
        {signedAmount(transaction, showValues)}
      </strong>
    </button>
  );
}

function TransactionFiltersLayer({
  closeRef,
  values,
  accountOptions,
  categoryOptions,
  loading,
  onChange,
  onClear,
  onClose,
}: {
  closeRef: RefObject<HTMLButtonElement | null>;
  values: Record<string, unknown>;
  accountOptions: { value: string; label: string }[];
  categoryOptions: { label: string; options: { value: string; label: string }[] }[];
  loading: boolean;
  onChange: (key: string, value: unknown) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-[var(--overlay)]" onClick={onClose} aria-label="Fechar filtros" tabIndex={-1} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-filters-title"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-[20px] border border-[var(--border-strong)] bg-[var(--background)] p-4 shadow-[var(--shadow-surface)] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(680px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[18px] sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--orbit-primary)]">Filtros</p>
            <h2 id="transaction-filters-title" className="mt-1 text-xl font-bold text-[var(--foreground)]">Refinar transações</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar filtros"
            className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              value={String(values.search ?? '')}
              onChange={(event) => onChange('search', event.target.value)}
              placeholder="Buscar transação..."
              aria-label="Buscar transação"
              disabled={loading}
            />
          </div>
          <Select label="Status" value={values.status as string | number | undefined} onChange={(value) => onChange('status', value)} options={statusOptions} placeholder="Todos" disabled={loading} />
          <Select label="Conta" value={values.accountId as string | number | undefined} onChange={(value) => onChange('accountId', value)} options={accountOptions} placeholder="Todas" disabled={loading} />
          <Select label="Mês" value={values.month as string | number | undefined} onChange={(value) => onChange('month', value)} options={monthOptions} placeholder="Todos" disabled={loading} />
          <Select label="Ano" value={values.year as string | number | undefined} onChange={(value) => onChange('year', value)} options={yearOptions} placeholder="Todos" disabled={loading} />
          <div className="sm:col-span-2">
            <Select label="Categoria" value={values.categoryId as string | number | undefined} onChange={(value) => onChange('categoryId', value)} options={categoryOptions} placeholder="Todas" grouped disabled={loading} />
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => { onClear(); onClose(); }}>Limpar filtros</Button>
          <Button onClick={onClose}>Aplicar filtros</Button>
        </div>
      </section>
    </>
  );
}

function TransactionDetailLayer({
  transaction,
  onClose,
  closeRef,
}: {
  transaction: TransactionDTO;
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-[var(--overlay)]" onClick={onClose} aria-label="Fechar detalhe da transação" tabIndex={-1} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-context-layer-title"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-y-auto rounded-t-[20px] border border-[var(--border-strong)] bg-[var(--background)] shadow-[var(--shadow-surface)] lg:inset-y-0 lg:left-auto lg:w-[430px] lg:max-h-none lg:rounded-none lg:border-y-0 lg:border-r-0"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--orbit-primary)]">Detalhe contextual</p>
            <h2 id="transaction-context-layer-title" className="mt-1 truncate text-lg font-bold text-[var(--foreground)]">{transaction.description || 'Transação'}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhe"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="p-4">
          <TransactionInfo transaction={transaction} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button as="a" href={`/transacoes/show/${transaction.id}`} variant="outline">Abrir detalhes</Button>
            <Button as="a" href={`/transacoes/nova?duplicate=${encodeURIComponent(transaction.id)}`} variant="outline">Duplicar</Button>
          </div>
        </div>
      </aside>
    </>
  );
}
