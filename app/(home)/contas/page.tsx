"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"
import { useCreateOrEditItem } from "@/app/hook/useCreateOrEditItem"

// Services
import { accountService } from "@/app/services/accountService";

// Components
import { ProtectedRoute, Modal, AccountFilters, AccountList, GenericListPage, AccountForm } from "@/app/components";

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
    handleCancelImport,
    refreshData,
    user
  } = usePaginatedData<AccountModel>({
    defaultFilters: { type: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: accountService.getAccounts,
    importFunction: accountService.importAccount,
    importLog: "account"
  });

  const {
    openBatchModal,
    isDeletingBatch,
    handleDeleteBatchClick,
    handleConfirmDeleteBatch,
    handleCloseBatchModal,
    selectedIds
  } = useDeleteItem({
    deleteFunction: accountService.deleteAccount,
    deleteBatchFunction: accountService.deleteAccountBatch,
    onSuccess: handleClearFilters,
    successMessage: "Conta excluída com sucesso",
    errorMessage: "Erro ao excluir conta"
  });

  const {
    isSubmitting,
    isModalOpen,
    editingItem,
    handleCreate,
    handleEdit,
    handleClose,
    handleSubmit
  } = useCreateOrEditItem<AccountModel, any>({
    createFunction: accountService.createAccount,
    updateFunction: accountService.updateAccount,
    successMessage: {
      create: "Conta criada com sucesso!",
      update: "Conta atualizada com sucesso!"
    },
    errorMessage: {
      create: "Erro ao criar Conta",
      update: "Erro ao atualizar Conta"
    },
    onSuccess: () => {
      handleClose();
      refreshData();
    }
  });

  const handleFormSubmit = async (formData: any) => {
    if (!user) return;

    const payload = {
      ...formData,
      userId: user.id
    };

    await handleSubmit(payload, editingItem?.id);
  };

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
            onCreate={handleCreate}
            onFileSelect={handleFileSelect}
          />
        }
        listComponent={
          <AccountList
            accounts={accounts}
            onDeleteBatch={handleDeleteBatchClick}
            onEdit={handleEdit}
            isDeleting={isDeletingBatch}
          />
        }
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        size="lg"
        title={editingItem?.id ? "Editar Conta" : "Nova Conta"}
        hideActions={true}
      >
        <AccountForm
          account={editingItem || undefined}
          isEdit={!!editingItem?.id}
          onSubmit={handleFormSubmit}
          onCancel={handleClose}
          isSubmitting={isSubmitting}
        />
      </Modal>

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
          <p className="text-sm text-gray-600">
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