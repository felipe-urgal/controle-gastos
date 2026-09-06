'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FaFileImport, FaPlus, FaTimes } from 'react-icons/fa';

import { IndexPage } from '@/app/components/base-pages';
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

type InboxGroup = {
  key: string;
  title: string;
  description: string;
  items: TransactionDTO[];
  emphasis?: 'warning' | 'muted';
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
      description: 'Pendências com data anterior a hoje.',
      items: attention.sort(oldestFirst),
      emphasis: 'warning',
    },
    {
      key: 'pending',
      title: 'Pendentes de hoje',
      description: 'Lançamentos pendentes com data de hoje.',
      items: pending.sort(oldestFirst),
    },
    {
      key: 'scheduled',
      title: 'Agendadas',
      description: 'Pendências com data futura dentro do recorte atual.',
      items: scheduled.sort(oldestFirst),
    },
    {
      key: 'completed',
      title: 'Concluídas recentes',
      description: 'Movimentações já realizadas no recorte atual.',
      items: completed.sort(newestFirst),
    },
    {
      key: 'cancelled',
      title: 'Canceladas',
      description: 'Mantidas visíveis para não perder contexto do histórico.',
      items: cancelled.sort(newestFirst),
      emphasis: 'muted',
    },
  ];
}

export default function Index() {
  const {
    loading,
    transactions,
    viewMode,
    setViewMode,
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

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeView, setActiveView] = useState<TransactionsView>('inbox');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDTO | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);

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

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: account.name,
      })),
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
      ...transactionFilters,
      {
        type: 'select',
        key: 'accountId',
        label: 'Conta',
        options: accountOptions,
      },
      {
        type: 'select',
        key: 'categoryId',
        label: 'Categoria',
        options: categoryOptions,
      },
    ],
    [accountOptions, categoryOptions],
  );

  const inboxGroups = useMemo(() => buildInboxGroups(transactions), [transactions]);

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

  return (
    <ProtectedRoute>
      <header className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
            Inbox Financeira
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Transações
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
            Trate primeiro o que pede ação; use o histórico para consultar o recorte completo sem perder filtros.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button as="a" href="/transacoes/importar" variant="outline" icon={<FaFileImport />}>
            Importar
          </Button>
          <Button as="a" href="/transacoes/nova" icon={<FaPlus />} className="hidden sm:inline-flex">
            Nova transação
          </Button>
        </div>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex w-fit rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1"
          role="group"
          aria-label="Visão das transações"
        >
          <button
            type="button"
            aria-pressed={activeView === 'inbox'}
            onClick={() => setActiveView('inbox')}
            className={`min-h-10 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
              activeView === 'inbox'
                ? 'bg-[var(--primary-subtle)] text-[var(--orbit-primary)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
            }`}
          >
            Inbox
          </button>
          <button
            type="button"
            aria-pressed={activeView === 'history'}
            onClick={() => setActiveView('history')}
            className={`min-h-10 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
              activeView === 'history'
                ? 'bg-[var(--primary-subtle)] text-[var(--orbit-primary)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
            }`}
          >
            Histórico
          </button>
        </div>

        <p className="text-sm text-[var(--text-muted)]" role="status">
          {loading ? 'Carregando transações…' : `${total} resultado${total === 1 ? '' : 's'} no recorte atual`}
        </p>
      </div>

      <DynamicFilters
        fields={filtersWithRelations}
        values={filters}
        onChange={(key, value) =>
          setFilters((previous) => ({
            ...previous,
            [key]: value,
          }))
        }
        viewMode={activeView === 'history' ? viewMode : undefined}
        onViewModeChange={activeView === 'history' ? setViewMode : undefined}
        loading={loading}
        onClear={clearFilters}
        total={total}
      />

      <div className="mt-4">
        {activeView === 'inbox' ? (
          <TransactionsInbox
            groups={inboxGroups}
            loading={loading}
            pagination={pagination}
            searchTerm={filters.search ?? ''}
            onChanged={() => refetch({ silent: true })}
            onOpen={setSelectedTransaction}
          />
        ) : (
          <section aria-labelledby="transactions-history-title" className="space-y-3">
            <div>
              <h2 id="transactions-history-title" className="text-xl font-semibold text-[var(--foreground)]">
                Histórico
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Lista cronológica completa do recorte e filtros atuais.
              </p>
            </div>

            <IndexPage
              items={transactions}
              loading={loading}
              viewMode={viewMode}
              emptyTitle="Nenhuma transação encontrada"
              renderItem={(transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  viewMode={viewMode}
                  searchTerm={filters.search ?? ''}
                  onChanged={() => refetch({ silent: true })}
                  onOpen={setSelectedTransaction}
                />
              )}
              pagination={pagination}
            />
          </section>
        )}
      </div>

      <section className="mt-6" aria-labelledby="transactions-summary-title">
        <div className="mb-3">
          <h2 id="transactions-summary-title" className="text-lg font-semibold text-[var(--foreground)]">
            Resumo do recorte
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Totais auxiliares ficam depois do workspace para não empurrar a operação principal para baixo.
          </p>
        </div>
        <TransactionSummary summary={summary} loading={loading} />
      </section>

      <Link
        href="/transacoes/nova"
        aria-label="Nova transação"
        className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--orbit-primary)] text-white shadow-[var(--shadow-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:hidden"
        style={{
          bottom: 'calc(var(--app-mobile-bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)',
        }}
      >
        <FaPlus aria-hidden="true" />
      </Link>

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

function TransactionsInbox({
  groups,
  loading,
  pagination,
  searchTerm,
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
  searchTerm: string;
  onChanged: () => Promise<void> | void;
  onOpen: (transaction: TransactionDTO) => void;
}) {
  const hasItems = groups.some((group) => group.items.length > 0);

  return (
    <section aria-labelledby="transactions-inbox-title" className="space-y-4">
      <div>
        <h2 id="transactions-inbox-title" className="text-xl font-semibold text-[var(--foreground)]">
          Inbox
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
          A classificação usa somente `status` e data lógica. Origem de importação continua fora enquanto o contrato não expuser esse dado.
        </p>
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          loading={loading}
        />
      )}

      {loading ? (
        <PageLoading type="list" />
      ) : !hasItems ? (
        <PageEmpty title="Nenhuma transação encontrada" />
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-5">
          {groups.map((group) => (
            <InboxGroupCard
              key={group.key}
              group={group}
              searchTerm={searchTerm}
              onChanged={onChanged}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function InboxGroupCard({
  group,
  searchTerm,
  onChanged,
  onOpen,
}: {
  group: InboxGroup;
  searchTerm: string;
  onChanged: () => Promise<void> | void;
  onOpen: (transaction: TransactionDTO) => void;
}) {
  const [isOpen, setIsOpen] = useState(
    group.items.length > 0 && (group.key === 'attention' || group.key === 'pending'),
  );
  const countLabel = `${group.items.length} ${group.items.length === 1 ? 'item' : 'itens'}`;

  return (
    <details
      className={`group ds-panel min-w-0 overflow-hidden ${
        group.emphasis === 'warning' && group.items.length > 0 ? 'border-[var(--warning)]/45' : ''
      }`}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--foreground)]">{group.title}</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-sm font-semibold ${
                group.emphasis === 'warning' && group.items.length > 0
                  ? 'border-[var(--warning)]/40 text-[var(--warning)]'
                  : 'border-[var(--border-strong)] text-[var(--text-muted)]'
              }`}
            >
              {countLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{group.description}</p>
        </div>
        <span
          className="text-lg text-[var(--text-muted)] transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          ⌄
        </span>
      </summary>

      <div className="border-t border-[var(--border)] p-3">
        {group.items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Nada nesta seção no recorte atual.</p>
        ) : (
          <div className="space-y-3">
            {group.items.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                viewMode="list"
                searchTerm={searchTerm}
                onChanged={onChanged}
                onOpen={onOpen}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function TransactionDetailLayer({
  transaction,
  onClose,
  closeRef,
}: {
  transaction: TransactionDTO;
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-[var(--overlay)]"
        onClick={onClose}
        aria-label="Fechar detalhe da transação"
        tabIndex={-1}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-context-layer-title"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] overflow-y-auto rounded-t-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--background)] shadow-[var(--shadow-surface)] lg:inset-y-0 lg:left-auto lg:w-[min(820px,calc(100vw-var(--app-sidebar-width)-2rem))] lg:max-h-none lg:rounded-none lg:border-y-0 lg:border-r-0"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--orbit-primary)]">
              Detalhe contextual
            </p>
            <h2 id="transaction-context-layer-title" className="truncate text-lg font-semibold text-[var(--foreground)]">
              {transaction.description || 'Transação'}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhe"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <TransactionInfo transaction={transaction} />
        </div>
      </aside>
    </>
  );
}
