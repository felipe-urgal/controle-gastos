"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Services
import { transactionService } from "@/app/services/transactionService";

// Components
import { ProtectedRoute, Breadcrumb, GenericListPage, TransactionList, TransactionFilters, Modal } from "@/app/components";

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
  const {
    data: transactions,
    isLoading,
    isLoadingMore,
    message,
    searchTerm,
    filters,
    handleSearchChange,
    handleFilterChange,
    handleClearFilters,
    handlePageChange,
    currentPage,
    totalItems,
    totalPages
  } = usePaginatedData<TransactionModel>({
    defaultFilters: { type: "", month: "", year: "", category: "", account: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: transactionService.getTransactions,
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
        currentPage={currentPage}
        totalItems={totalItems}
        totalPages={totalPages}
        itemsPerPage={15} // Mesmo valor que itemsPerLoad
        onPageChange={handlePageChange} // Passe a função de mudança de página
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