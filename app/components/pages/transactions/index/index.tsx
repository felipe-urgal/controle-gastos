'use client';

import { useEffect, useMemo, useState } from 'react';

import { IndexPage, PageHeader } from '@/app/components/base-pages';
import { PageEmpty, PageLoading } from '@/app/components/feedback';
import { ProtectedRoute } from '@/app/components/layout';
import { DynamicFilters, Pagination } from '@/app/components/navigation';
import { TransactionCard, TransactionSummary } from '@/app/components/pages/transactions';
import { Button } from '@/app/components/ui';
import { FilterField } from '@/app/components/navigation/dynamic-filters';
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

  const newestFirst = (a: TransactionDTO, b: TransactionDTO) => transactionDateKey(b) - transactionDateKey(a);
  const oldestFirst = (a: TransactionDTO, b: TransactionDTO) => transactionDateKey(a) - transactionDateKey(b);

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
      <PageHeader
        title="Transações"
        description="Trate primeiro o que pede ação e preserve o histórico cronológico para consulta."
        createUrl="/transacoes/nova"
        createLabel="Nova transação"
        loading={loading}
      />

      <section className="ds-panel mb-5 p-4 sm:p-5" aria-labelledby="transactions-workspace-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
              Inbox Financeira
            </p>
            <h2 id="transactions-workspace-title" className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              Movimentações por situação
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              A Inbox reorganiza somente os lançamentos já carregados. Nenhum status financeiro é inferido ou alterado pela interface.
            </p>
          </div>
          <Button as="a" href="/transacoes/importar" variant="outline" size="sm">
            Importar CSV/OFX
          </Button>
        </div>

        <div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-4" role="group" aria-label="Visão das transações">
          <button
            type="button"
            aria-pressed={activeView === 'inbox'}
            onClick={() => setActiveView('inbox')}
            className={`min-h-11 rounded-[var(--radius-md)] border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
              activeView === 'inbox'
                ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                : 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
            }`}
          >
            Inbox
          </button>
          <button
            type="button"
            aria-pressed={activeView === 'history'}
            onClick={() => setActiveView('history')}
            className={`min-h-11 rounded-[var(--radius-md)] border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${
              activeView === 'history'
                ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                : 'border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
            }`}
          >
            Histórico
          </button>
        </div>
      </section>

      <TransactionSummary summary={summary} loading={loading} />

      <DynamicFilters
        fields={filtersWithRelations}
        values={filters}
        onChange={(key, value) =>
          setFilters((previous) => ({
            ...previous,
            [key]: value,
          }))
        }
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        onClear={clearFilters}
        total={total}
      />

      {activeView === 'inbox' ? (
        <TransactionsInbox
          groups={inboxGroups}
          loading={loading}
          pagination={pagination}
          searchTerm={filters.search ?? ''}
          onChanged={() => refetch({ silent: true })}
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
              />
            )}
            pagination={pagination}
          />
        </section>
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
}) {
  const hasItems = groups.some((group) => group.items.length > 0);

  return (
    <section aria-labelledby="transactions-inbox-title" className="space-y-4">
      <div>
        <h2 id="transactions-inbox-title" className="text-xl font-semibold text-[var(--foreground)]">
          Inbox
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
          A classificação abaixo usa apenas `status` e a data lógica de cada lançamento. Itens importados não recebem tratamento especial sem origem explícita no contrato atual.
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
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {groups.map((group) => (
            <InboxGroupCard
              key={group.key}
              group={group}
              searchTerm={searchTerm}
              onChanged={onChanged}
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
}: {
  group: InboxGroup;
  searchTerm: string;
  onChanged: () => Promise<void> | void;
}) {
  const countLabel = `${group.items.length} ${group.items.length === 1 ? 'item' : 'itens'}`;

  return (
    <details
      className={`group ds-panel overflow-hidden ${
        group.emphasis === 'warning' && group.items.length > 0 ? 'border-[var(--warning)]/45' : ''
      }`}
      open={group.key === 'attention' && group.items.length > 0 ? true : undefined}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5">
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
        <span className="text-lg text-[var(--text-muted)] transition-transform group-open:rotate-180" aria-hidden="true">
          ⌄
        </span>
      </summary>

      <div className="border-t border-[var(--border)] p-3 sm:p-4">
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
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
