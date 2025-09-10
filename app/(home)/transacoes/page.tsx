"use client";

// Hooks
import { Suspense, useRef } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"
import { useCreateOrEditItem } from "@/app/hook/useCreateOrEditItem"
import { useImport } from "@/app/hook/useImport"

// Services
import { transactionService } from "@/app/services/transactionService";

// Components
import { ProtectedRoute, GenericListPage, TransactionList, TransactionFilters, Modal, TransactionForm } from "@/app/components";

// Types
import { TransactionModel } from '@/app/types/transaction'
import { TransactionFormRef } from "@/app/components/transactions/TransactionForm";

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
    user,
    refreshData
  } = usePaginatedData<TransactionModel>({
    defaultFilters: { type: "", month: "", year: "", category: "", account: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: transactionService.getTransactions,
  });

  // Função wrapper para o useImport que retorna a Response diretamente
  const importTransactionsWrapper = async (file: File, userId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    
    // Chamar a API diretamente e retornar a Response
    return fetch('/api/transactions/import', {
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
    importFunction: importTransactionsWrapper, // Usar a wrapper function
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
    deleteBatchFunction: transactionService.deleteTransactionBatch,
    deleteFunction: transactionService.deleteTransaction,
    onSuccess: () => {
      handleCloseBatchModal();
      refreshData();
    },
    successMessage: "Transação excluída com sucesso",
    errorMessage: "Erro ao excluir transação"
  });

  const {
    isSubmitting,
    isModalOpen,
    editingItem,
    handleCreate,
    handleEdit,
    handleClose,
    handleSubmit
  } = useCreateOrEditItem<TransactionModel, any>({
    createFunction: transactionService.createTransaction,
    updateFunction: transactionService.updateTransaction,
    successMessage: {
      create: "Investimento criado com sucesso!",
      update: "Investimento atualizado com sucesso!"
    },
    errorMessage: {
      create: "Erro ao criar Investimento",
      update: "Erro ao atualizar Investimento"
    },
    onSuccess: () => {
      handleClose();
      refreshData();
    }
  });

  const formRef = useRef<TransactionFormRef>(null);

  const handleFormSubmit = async (formData: any): Promise<void> => {
    if (!user) return;

    const payload = {
      ...formData,
      userId: user.id
    };

    try {
      await handleSubmit(payload, editingItem?.id);
    } catch (error) {
      console.error("Erro ao criar/editar investimento:", error);
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
            onCreate={handleCreate}
          />
        }
        listComponent={
          <TransactionList
            transactions={transactions}
            onDeleteBatch={handleDeleteBatchClick}
            isDeleting={isDeletingBatch}
            onEdit={handleEdit}
          />
        }
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        onConfirm={handleModalSubmit}
        title={editingItem?.id ? "Editar Transação" : "Novo Transação"}
        confirmText={editingItem?.id ? "Atualizar" : "Criar"}
        cancelText="Cancelar"
        isLoading={isSubmitting}
      >
        <TransactionForm
          ref={formRef}
          transaction={editingItem || undefined}
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
      <TransactionsPage />
    </Suspense>
  );
}
