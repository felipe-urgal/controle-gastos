"use client";

// hooks
import { useTransactions } from "@/app/hooks/transactions/transaction-index";

// components
import { PageHeader, IndexPage } from "@/app/components/base-pages";
import { DynamicFilters } from "@/app/components/navigation";
import { TransactionCard } from "@/app/components/pages/transactions";
import { ProtectedRoute } from "@/app/components/layout";

// importing constants
import { transactionFilters } from "@/app/lib/constants/transaction.constants";

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
  } = useTransactions();

  return (
    <ProtectedRoute>
      <PageHeader
        title="Transações"
        description="Gerencie suas receitas e despesas"
        createUrl="/transacoes/nova"
        loading={loading}
      />

      <DynamicFilters
        fields={transactionFilters}
        values={filters}
        onChange={(key, value) =>
          setFilters((prev) => ({
            ...prev,
            [key]: value,
          }))
        }
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        onClear={clearFilters}
        total={total}
      />

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
            searchTerm={filters.search ?? ""}
          />
        )}
        pagination={(hasPagination && (totalPages && totalPages > 1))? {
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        } : undefined}
      />
    </ProtectedRoute>
  );
};
