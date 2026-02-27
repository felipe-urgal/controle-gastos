"use client";

// hooks
import { useTransactions } from "@/app/hooks/transactions/transaction-index";

// components
import { PageHeader, EntityList } from "@/app/components/pages";
import { ListFilters } from "@/app/components/navigation";
import { TransactionCard } from "@/app/components/transactions";
import { ProtectedRoute } from "@/app/components/layout";

export default function Index() {
  const { 
    loading,
    transactions,
    search,
    setSearch,
    viewMode,
    setViewMode,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasPagination,
  } = useTransactions();

  return (
    <ProtectedRoute>
      <PageHeader
        title="Transações"
        description="Gerencie suas receitas e despesas"
        createUrl="/transacoes/nova"
        loading={loading}
      />

      <ListFilters
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loading={loading}
        searchPlaceholder="Buscar transação..."
      />

      <EntityList
        items={transactions}
        loading={loading}
        viewMode={viewMode}
        emptyTitle="Nenhuma transação encontrada"
        renderItem={(transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            viewMode={viewMode}
            searchTerm={search}
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
