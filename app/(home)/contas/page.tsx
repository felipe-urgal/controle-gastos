"use client";

// Hooks
import { Suspense, useRef } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"
import { useCreateOrEditItem } from "@/app/hook/useCreateOrEditItem"
import { useImport } from "@/app/hook/useImport"

// Services
import { accountService } from "@/app/services/accountService";

// Components
import { ProtectedRoute, Modal, AccountFilters, AccountList, GenericListPage, AccountForm } from "@/app/components";

// Types
import { AccountModel } from '@/app/types/account'
import { AccountFormRef } from "@/app/components/accounts/AccountForm";

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
    refreshData,
    user
  } = usePaginatedData<AccountModel>({
    defaultFilters: { type: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: accountService.getAccounts,
  });

  // Função wrapper para o useImport que retorna a Response diretamente
  const importAccountWrapper = async (file: File, userId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    
    // Chamar a API diretamente e retornar a Response
    return fetch('/api/account/import', {
      method: 'POST',
      body: formData,
    });
  };

  const {
    importLoading,
    importModalOpen,
    importPreview,
    handleFileSelect,
    handleConfirmImport,
    handleCancelImport,
  } = useImport({
    importFunction: importAccountWrapper, // Usar a wrapper function
    onSuccess: refreshData
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
    onSuccess: () => {
      handleCloseBatchModal();
      refreshData();
    },
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

  const formRef = useRef<AccountFormRef>(null);

  const handleFormSubmit = async (formData: any): Promise<void> => {
    if (!user) return;

    const payload = {
      ...formData,
      userId: user.id
    };

    try {
      await handleSubmit(payload, editingItem?.id);
    } catch (error) {
      console.error("Erro ao criar/editar conta:", error);
    }
  };

  const handleModalSubmit = async () => {
    if (!formRef.current) return;

    try {
      await formRef.current.submitForm();
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
    }
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
            loading={isLoading}
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
        onConfirm={handleModalSubmit}
        title={editingItem?.id ? "Editar Conta" : "Novo Conta"}
        confirmText={editingItem?.id ? "Atualizar" : "Criar"}
        cancelText="Cancelar"
        isLoading={isSubmitting}
      >
        <AccountForm
          ref={formRef}
          account={editingItem || undefined}
          isEdit={!!editingItem?.id}
          onSubmit={handleFormSubmit}
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
        onConfirm={() => handleConfirmImport(user?.id || '')} // Passar user ID
        confirmText={`Importar ${importPreview.length} item${importPreview.length !== 1 ? 's' : ''}`}
        isLoading={importLoading}
        type="import"
        importPreview={importPreview}
      />
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