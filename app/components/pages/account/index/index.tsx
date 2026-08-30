'use client';

import { IndexPage, PageHeader } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import { DynamicFilters } from '@/app/components/navigation';
import { AccountCard } from '@/app/components/pages/account';
import { useAccounts } from '@/app/hooks/accounts/account-index';
import { accountFilters } from '@/app/lib/constants/account.constants';

export default function Index() {
  const {
    loading,
    accounts,
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
  } = useAccounts();

  return (
    <ProtectedRoute>
      <PageHeader
        title="Contas"
        description="Organize suas contas e acompanhe o saldo derivado das movimentações concluídas."
        createUrl="/contas/nova"
        createLabel="Nova conta"
        loading={loading}
      />

      <DynamicFilters
        fields={accountFilters}
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

      <section aria-labelledby="accounts-list-title" className="space-y-3">
        <div>
          <h2 id="accounts-list-title" className="text-xl font-semibold text-[var(--foreground)]">
            Suas contas
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Abra uma conta para consultar detalhes, movimentações recentes e ações de edição.
          </p>
        </div>

        <IndexPage
          items={accounts}
          loading={loading}
          viewMode={viewMode}
          emptyTitle="Nenhuma conta encontrada"
          renderItem={(account) => (
            <AccountCard
              key={account.id}
              account={account}
              viewMode={viewMode}
              searchTerm={filters.search ?? ''}
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
