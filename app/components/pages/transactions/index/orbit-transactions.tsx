'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import {
  FaFileImport,
  FaFilter,
  FaPlus,
  FaTimes,
} from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { DynamicFilters, Pagination } from '@/app/components/navigation';
import type { FilterField } from '@/app/components/navigation/dynamic-filters';
import {
  TransactionCard,
  TransactionInfo,
  TransactionSummary,
} from '@/app/components/pages/transactions';
import { Button } from '@/app/components/ui';
import { useTransactions } from '@/app/hooks/transactions/transaction-index';
import { transactionFilters } from '@/app/lib/constants/transaction.constants';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import type { TransactionDTO } from '@/app/types/transaction';

type TransactionsView = 'inbox' | 'history';

type InboxGroup = {
  key: 'attention' | 'pending' | 'scheduled' | 'completed' | 'cancelled';
  title: string;
  description: string;
  items: TransactionDTO[];
  tone?: 'warning' | 'muted';
};

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; type: 'INCOME' | 'EXPENSE' };

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
    { key: 'attention', title: 'Precisa atenção', description: 'Pendências vencidas', items: attention.sort(oldestFirst), tone: 'warning' },
    { key: 'pending', title: 'Pendentes', description: 'Aguardando conclusão', items: pending.sort(oldestFirst) },
    { key: 'scheduled', title: 'Agendadas', description: 'Compromissos futuros', items: scheduled.sort(oldestFirst) },
    { key: 'completed', title: 'Concluídas', description: 'Movimentações realizadas', items: completed.sort(newestFirst) },
    { key: 'cancelled', title: 'Canceladas', description: 'Mantidas no contexto', items: cancelled.sort(newestFirst), tone: 'muted' },
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
    summary,
    refetch,
  } = useTransactions();

  const desktop = useDesktopBreakpoint();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [activeView, setActiveView] = useState<TransactionsView>('inbox');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDTO | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);

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

  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );
  const categoryOptions = useMemo(() => {
    const income = categories.filter((category) => category.type === 'INCOME').map((category) => ({ value: category.id, label: category.name }));
    const expense = categories.filter((category) => category.type === 'EXPENSE').map((category) => ({ value: category.id, label: category.name }));
    return [
      ...(income.length ? [{ label: 'Receitas', options: income }] : []),
      ...(expense.length ? [{ label: 'Despesas', options: expense }] : []),
    ];
  }, [categories]);

  const filtersWithRelations = useMemo<FilterField[]>(
    () => [
      ...transactionFilters,
      { type: 'select', key: 'accountId', label: 'Conta', options: accountOptions },
      { type: 'select', key: 'categoryId', label: 'Categoria', options: categoryOptions },
    ],
    [accountOptions, categoryOptions],
  );

  const groups = useMemo(() => buildInboxGroups(transactions), [transactions]);
  const selectedHistory = transactions.find((transaction) => transaction.id === selectedHistoryId) ?? transactions[0] ?? null;
  const pagination = hasPagination && totalPages && totalPages > 1
    ? { page, pageSize, total, totalPages, onPageChange: setPage, onPageSizeChange: setPageSize }
    : undefined;

  function openHistory(transaction: TransactionDTO) {
    setSelectedHistoryId(transaction.id);
    if (!desktop) setSelectedTransaction(transaction);
  }

  return (
    <ProtectedRoute>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">INBOX FINANCEIRA</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-[30px]">Transações</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Trate primeiro o que pede ação e use o histórico para consultar o recorte completo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/transacoes/importar" className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaFileImport aria-hidden="true" /> Importar</Link>
          <Link href="/transacoes/nova" className="hidden min-h-11 items-center gap-2 rounded-[10px] border border-[var(--orbit-primary)]/40 bg-[var(--primary-subtle)] px-3 text-sm font-bold text-[var(--orbit-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:inline-flex"><FaPlus aria-hidden="true" /> Nova transação</Link>
        </div>
      </header>

      <div className="my-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2" role="tablist" aria-label="Visão das transações">
          {(['inbox', 'history'] as const).map((view) => (
            <button key={view} type="button" role="tab" aria-selected={activeView === view} onClick={() => setActiveView(view)} className={`min-h-10 rounded-[10px] border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${activeView === view ? 'border-[var(--orbit-primary)] bg-[var(--primary-subtle)] text-[var(--orbit-primary)]' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'}`}>{view === 'inbox' ? 'Inbox' : 'Histórico'}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]" role="status">{loading ? 'Carregando…' : `${total ?? transactions.length} resultado${(total ?? transactions.length) === 1 ? '' : 's'}`}</span>
          <Button size="sm" variant="secondary" icon={<FaFilter />} onClick={() => setFiltersOpen(true)}>Filtros</Button>
        </div>
      </div>

      <TransactionSummary summary={summary} loading={loading} />

      <div className="mt-4">
        {activeView === 'inbox' ? (
          <InboxBoard
            groups={groups}
            loading={loading}
            pagination={pagination}
            searchTerm={filters.search ?? ''}
            onChanged={() => refetch({ silent: true })}
            onOpen={setSelectedTransaction}
          />
        ) : (
          <HistoryWorkspace
            transactions={transactions}
            loading={loading}
            selected={selectedHistory}
            searchTerm={filters.search ?? ''}
            pagination={pagination}
            onChanged={() => refetch({ silent: true })}
            onOpen={openHistory}
          />
        )}
      </div>

      <Link href="/transacoes/nova" aria-label="Nova transação" className="fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[var(--orbit-primary)] text-white shadow-[var(--shadow-surface)] sm:hidden" style={{ bottom: 'calc(var(--app-mobile-bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)' }}><FaPlus aria-hidden="true" /></Link>

      {filtersOpen && (
        <FilterDialog closeRef={filterCloseRef} fields={filtersWithRelations} values={filters} loading={loading} total={total} onChange={(key, value) => setFilters((previous) => ({ ...previous, [key]: value }))} onClear={clearFilters} onClose={() => setFiltersOpen(false)} />
      )}
      {selectedTransaction && <TransactionDetailLayer transaction={selectedTransaction} closeRef={detailCloseRef} onClose={() => setSelectedTransaction(null)} />}
    </ProtectedRoute>
  );
}

function InboxBoard({ groups, loading, pagination, searchTerm, onChanged, onOpen }: { groups: InboxGroup[]; loading: boolean; pagination?: PaginationProps; searchTerm: string; onChanged: () => Promise<void> | void; onOpen: (transaction: TransactionDTO) => void }) {
  const hasItems = groups.some((group) => group.items.length > 0);
  if (loading) return <PageLoading type="list" />;
  if (!hasItems) return <PageEmpty title="Nenhuma transação encontrada" />;

  return (
    <section aria-label="Inbox Financeira">
      {pagination && <div className="mb-3"><Pagination {...pagination} loading={loading} /></div>}
      <div className="hidden grid-cols-5 items-start gap-3 xl:grid">
        {groups.map((group) => <DesktopLane key={group.key} group={group} searchTerm={searchTerm} onChanged={onChanged} onOpen={onOpen} />)}
      </div>
      <div className="grid gap-3 xl:hidden">
        {groups.map((group) => <MobileLane key={group.key} group={group} searchTerm={searchTerm} onChanged={onChanged} onOpen={onOpen} />)}
      </div>
    </section>
  );
}

function LaneHeader({ group }: { group: InboxGroup }) {
  return <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="text-sm font-bold text-[var(--foreground)]">{group.title}</h2><p className="mt-0.5 text-xs text-[var(--text-muted)]">{group.description}</p></div><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${group.tone === 'warning' && group.items.length ? 'border-[var(--warning)]/45 text-[var(--warning)]' : 'border-[var(--border-strong)] text-[var(--text-muted)]'}`}>{group.items.length}</span></div>;
}

function DesktopLane({ group, searchTerm, onChanged, onOpen }: LaneProps) {
  return <article className="min-w-0 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3"><LaneHeader group={group} /><div className="mt-3 grid gap-2.5">{group.items.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">Nada nesta seção.</p> : group.items.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} viewMode="list" searchTerm={searchTerm} onChanged={onChanged} onOpen={onOpen} />)}</div></article>;
}

function MobileLane({ group, searchTerm, onChanged, onOpen }: LaneProps) {
  return <details className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)]" open={group.key === 'attention' || group.key === 'pending'}><summary className="cursor-pointer list-none p-3"><LaneHeader group={group} /></summary><div className="grid gap-2.5 border-t border-[var(--border)] p-3">{group.items.length === 0 ? <p className="text-xs text-[var(--text-muted)]">Nada nesta seção.</p> : group.items.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} viewMode="list" searchTerm={searchTerm} onChanged={onChanged} onOpen={onOpen} />)}</div></details>;
}

function HistoryWorkspace({ transactions, loading, selected, searchTerm, pagination, onChanged, onOpen }: { transactions: TransactionDTO[]; loading: boolean; selected: TransactionDTO | null; searchTerm: string; pagination?: PaginationProps; onChanged: () => Promise<void> | void; onOpen: (transaction: TransactionDTO) => void }) {
  return (
    <section aria-labelledby="transactions-history-title">
      <div className="mb-3"><h2 id="transactions-history-title" className="text-lg font-bold text-[var(--foreground)]">Histórico</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Lista cronológica do recorte e filtros atuais.</p></div>
      {pagination && <div className="mb-3"><Pagination {...pagination} loading={loading} /></div>}
      {loading ? <PageLoading type="list" /> : transactions.length === 0 ? <PageEmpty title="Nenhuma transação encontrada" /> : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_430px]">
          <div className="grid gap-2.5">{transactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} viewMode="list" searchTerm={searchTerm} onChanged={onChanged} onOpen={onOpen} />)}</div>
          <aside className="hidden max-h-[calc(100vh-120px)] overflow-y-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4 lg:sticky lg:top-4 lg:block" aria-label="Detalhe da transação selecionada">{selected ? <TransactionInfo transaction={selected} /> : <p className="text-sm text-[var(--text-muted)]">Selecione uma transação.</p>}</aside>
        </div>
      )}
    </section>
  );
}

function FilterDialog({ closeRef, fields, values, loading, total, onChange, onClear, onClose }: { closeRef: RefObject<HTMLButtonElement | null>; fields: FilterField[]; values: Record<string, any>; loading: boolean; total?: number; onChange: (key: string, value: any) => void; onClear: () => void; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-end bg-[var(--overlay)] sm:place-items-center" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-labelledby="transaction-filter-title" className="max-h-[86dvh] w-full overflow-y-auto rounded-t-[18px] border border-[var(--border-strong)] bg-[var(--background)] p-4 shadow-[var(--shadow-surface)] sm:max-w-[720px] sm:rounded-[18px] sm:p-5"><header className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--orbit-primary)]">Refinar Inbox</p><h2 id="transaction-filter-title" className="mt-1 text-xl font-bold">Filtros</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar filtros" className="grid h-11 w-11 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"><FaTimes aria-hidden="true" /></button></header><DynamicFilters fields={fields} values={values} onChange={onChange} loading={loading} onClear={onClear} total={total} /></section></div>;
}

function TransactionDetailLayer({ transaction, onClose, closeRef }: { transaction: TransactionDTO; onClose: () => void; closeRef: RefObject<HTMLButtonElement | null> }) {
  return <><button type="button" className="fixed inset-0 z-40 bg-[var(--overlay)]" onClick={onClose} aria-label="Fechar detalhe da transação" tabIndex={-1} /><aside role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title" className="fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] overflow-y-auto rounded-t-[18px] border border-[var(--border-strong)] bg-[var(--background)] shadow-[var(--shadow-surface)] lg:inset-y-0 lg:left-auto lg:w-[430px] lg:max-h-none lg:rounded-none lg:border-y-0 lg:border-r-0"><header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)] p-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--orbit-primary)]">Detalhe contextual</p><h2 id="transaction-detail-title" className="mt-1 truncate text-lg font-bold">{transaction.description || 'Transação'}</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar detalhe" className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"><FaTimes aria-hidden="true" /></button></header><div className="p-4"><TransactionInfo transaction={transaction} /></div></aside></>;
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
  searchTerm: string;
  onChanged: () => Promise<void> | void;
  onOpen: (transaction: TransactionDTO) => void;
};