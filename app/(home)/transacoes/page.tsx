"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Context
import { useAuth } from "@/app/context/AuthContext";

// Services
import { transactionService } from "@/app/services/transactionService";

// Components
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";
import { TransactionFilters } from "@/app/components/transactions/TransactionFilters";
import { TransactionList } from "@/app/components/transactions/TransactionList";
import Modal from "@/app/components/Modal";
import { GenericListPage } from "@/app/components/ui/GenericListPage";

// Types
import { TransactionModel } from '@/app/types/transaction'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransactionsPage />
    </Suspense>
  );
}

function TransactionsPage() {
  const { user } = useAuth();

  const {
    data: transactions,
    isLoading,
    isLoadingMore,
    hasMore,
    message,
    searchTerm,
    filters,
    handleSearchChange,
    handleFilterChange,
    handleClearFilters,
    handleLoadMore,
  } = usePaginatedData<TransactionModel, { id: string }>({
    defaultFilters: { type: "", month: "", year: "" },
    itemsPerLoad: 5,
    debounceDelay: 500,
    fetchFunction: transactionService.getTransactions,
    userDependency: user ?? { id: '' }
  });

  const {
    openModal,
    isDeleting,
    handleDeleteClick,
    handleConfirmDelete,
    handleCloseModal,
  } = useDeleteItem({
    deleteFunction: transactionService.deleteTransaction,
    onSuccess: handleClearFilters,
    successMessage: "Transação excluída com sucesso",
    errorMessage: "Erro ao excluir transação"
  });

  return (
    <ProtectedRoute>
      <GenericListPage
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        breadcrumbComponent={<Breadcrumb loading={isLoading || isLoadingMore} />}
        filterComponent={
          <TransactionFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            loading={isLoading || isLoadingMore}
            message={message}
          />
        }
        listComponent={
          <TransactionList
            transactions={transactions}
            onDelete={handleDeleteClick}
          />
        }
      />

      <Modal
        isOpen={openModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta transação?"
        confirmText="Excluir"
        isLoading={isDeleting}
      />
    </ProtectedRoute>
  );
}