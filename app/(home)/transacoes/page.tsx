"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Services
import { transactionService } from "@/app/services/transactionService";

// Components
import { ProtectedRoute, GenericListPage, TransactionList, TransactionFilters, Modal } from "@/app/components";

// Types
import { TransactionModel } from '@/app/types/transaction'

function TransactionsPage() {
  const {
    data: transactions,
    isLoading,
    message,
    searchTerm,
    filters,
    handleSearchChange,
    handleFilterChange,
    handleClearFilters,
    handlePageChange,
    currentPage,
    totalItems,
    totalPages,
    importLoading,
    importModalOpen,
    importPreview,
    handleFileSelect,
    handleConfirmImport,
    handleCancelImport
  } = usePaginatedData<TransactionModel>({
    defaultFilters: { type: "", month: "", year: "", category: "", account: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: transactionService.getTransactions,
    importFunction: transactionService.importTransactions,
    importLog: "transactions"
  });

  const {
    openModal,
    openBatchModal,
    isDeleting,
    isDeletingBatch,
    handleDeleteClick,
    handleDeleteBatchClick,
    handleConfirmDelete,
    handleConfirmDeleteBatch,
    handleCloseModal,
    handleCloseBatchModal,
    selectedIds
  } = useDeleteItem({
    deleteBatchFunction: transactionService.deleteTransactionBatch,
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
        filterComponent={
          <TransactionFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            loading={isLoading}
            message={message}
            onFileSelect={handleFileSelect}
          />
        }
        listComponent={
          <TransactionList
            transactions={transactions}
            onDelete={handleDeleteClick}
            onDeleteBatch={handleDeleteBatchClick}
            isDeleting={isDeleting || isDeletingBatch}
          />
        }
      />

      <Modal
        isOpen={openModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir este item?"
        confirmText="Excluir"
        isLoading={isDeleting}
      />

      <Modal
        isOpen={openBatchModal}
        onClose={handleCloseBatchModal}
        onConfirm={handleConfirmDeleteBatch}
        mensagem={`Tem certeza que deseja excluir ${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''}?`}
        confirmText={`Excluir ${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''}`}
        isLoading={isDeletingBatch}
      />

      <Modal
        isOpen={importModalOpen}
        onClose={handleCancelImport}
        onConfirm={handleConfirmImport}
        confirmText={`Importar ${importPreview.length} item${importPreview.length !== 1 ? 's' : ''}`}
        isLoading={importLoading}
        size="lg"
        type="import"
        importPreview={importPreview}
      >
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Confirme os dados que serão importados:
          </p>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransactionsPage />
    </Suspense>
  );
}
