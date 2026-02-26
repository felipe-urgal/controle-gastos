"use client";

// hooks
import { useTransactions } from "@/app/hooks/transactions/transaction-index";

// components
import PageHeader from "@/app/components/ui/PageHeader";
import ListFilters from "@/app/components/ui/ListFilters";
import EntityList from "@/app/components/ui/EntityList";
import TransactionCard from "@/app/components/transactions/index/card";
import ProtectedRoute from "../../ui/ProtectedRoute";

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
        renderItem={(transaction, index) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            viewMode={viewMode}
            searchTerm={search}
            index={index}
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
