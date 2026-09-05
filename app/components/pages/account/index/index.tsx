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
        description="Veja onde seu dinheiro está, com saldo atual em primeiro plano e cada moeda preservada isoladamente."
        createUrl="/contas/nova"
        createLabel="Nova conta"
        loading={loading}
      />

      <section className="ds-panel mb-5 p-4 sm:p-5" aria-labelledby="accounts-portfolio-title">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">
              Portfólio de contas
            </p>
            <h2 id="accounts-portfolio-title" className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              Seu dinheiro por conta
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
              O saldo exibido é derivado de movimentações concluídas. Valores de moedas diferentes nunca são somados.
            </p>
          </div>
          {!loading && typeof total === 'number' && (
            <p className="shrink-0 text-sm font-semibold text-[var(--text-muted)]">
              {total} {total === 1 ? 'conta encontrada' : 'contas encontradas'}
            </p>
          )}
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-4">
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
        </div>
      </section>

      <section aria-labelledby="accounts-list-title" className="space-y-3">
        <div>
          <h2 id="accounts-list-title" className="text-xl font-semibold text-[var(--foreground)]">
            Contas do portfólio
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Abra uma conta para consultar o detalhe e as movimentações recentes que compõem o saldo.
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
