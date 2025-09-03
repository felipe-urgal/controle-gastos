"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Services
import { accountService } from "@/app/services/accountService";

// Components
import { ProtectedRoute, Modal, AccountFilters, AccountList, GenericListPage } from "@/app/components";

// Types
import { AccountModel } from '@/app/types/account'

function AccountsPage() {
  const {
    data: accounts,
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
  } = usePaginatedData<AccountModel>({
    defaultFilters: { type: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: accountService.getAccounts,
    importFunction: accountService.importAccount,
    importLog: "account"
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
    deleteFunction: accountService.deleteAccount,
    deleteBatchFunction: accountService.deleteAccountBatch,
    onSuccess: handleClearFilters,
    successMessage: "Conta excluída com sucesso",
    errorMessage: "Erro ao excluir conta"
  });

  return (
    <ProtectedRoute>
      <GenericListPage
        isLoading={isLoading}
        currentPage={currentPage}
        totalItems={totalItems}
        totalPages={totalPages}
        itemsPerPage={15}
        onPageChange={handlePageChange}
        filterComponent={
          <AccountFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            loading={isLoading || importLoading}
            message={message}
            onFileSelect={handleFileSelect}
          />
        }
        listComponent={
          <AccountList
            accounts={accounts}
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
      <AccountsPage />
    </Suspense>
  );
}