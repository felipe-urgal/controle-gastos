'use client';

import { useEffect, useMemo, useState } from 'react';

import { PageHeader, IndexPage } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import { DynamicFilters } from '@/app/components/navigation';
import { TransactionCard, TransactionSummary } from '@/app/components/pages/transactions';
import { Button } from '@/app/components/ui';
import { FilterField } from '@/app/components/navigation/dynamic-filters';
import { useTransactions } from '@/app/hooks/transactions/transaction-index';
import { transactionFilters } from '@/app/lib/constants/transaction.constants';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
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
      .map((category) => ({
        value: category.id,
        label: category.name,
      }));

    const expense = categories
      .filter((category) => category.type === 'EXPENSE')
      .map((category) => ({
        value: category.id,
        label: category.name,
      }));

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

  return (
    <ProtectedRoute>
      <PageHeader
        title="Transações"
        description="Acompanhe receitas, despesas e lançamentos pendentes em um só lugar."
        createUrl="/transacoes/nova"
        createLabel="Nova transação"
        loading={loading}
      />

      <div className="flex justify-end">
        <Button as="a" href="/transacoes/importar" variant="outline" size="sm">
          Importar CSV/OFX
        </Button>
      </div>

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

      <section aria-labelledby="transactions-list-title" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="transactions-list-title" className="text-xl font-semibold text-[var(--foreground)]">
              Movimentações
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Abra um lançamento para ver detalhes ou use as ações rápidas disponíveis.
            </p>
          </div>
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
          pagination={
            hasPagination && totalPages && totalPages > 1
              ? {
                  page,
                  pageSize,
                  total,
                  totalPages,
                  onPageChange: setPage,
                  onPageSizeChange: setPageSize,
                }
              : undefined
          }
        />
      </section>
    </ProtectedRoute>
  );
}
