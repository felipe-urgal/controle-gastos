"use client";

// Hooks
import { Suspense, useRef } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"
import { useCreateOrEditItem } from "@/app/hook/useCreateOrEditItem"
import { useImport } from "@/app/hook/useImport"

// Services
import { investmentService } from "@/app/services/investmentService";

// Components
import { ProtectedRoute, InvestmentFilters, InvestmentList, Modal, GenericListPage, InvestmentForm } from "@/app/components";

// Types
import { InvestmentModel } from '@/app/types/investment'
import { InvestmentFormRef } from "@/app/components/investments/InvestmentForm";

function InvestmentsPage() {
  const {
    data: investments,
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
  } = usePaginatedData<InvestmentModel>({
    defaultFilters: { type: "", account: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: investmentService.getInvestments,
  });

  // Função wrapper para o useImport que retorna a Response diretamente
  const importInvestmentsWrapper = async (file: File, userId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    
    // Chamar a API diretamente e retornar a Response
    return fetch('/api/investments/import', {
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
    importFunction: importInvestmentsWrapper, // Usar a wrapper function
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
    deleteBatchFunction: investmentService.deleteInvestmentBatch,
    deleteFunction: investmentService.deleteInvestment,
    onSuccess: () => {
      handleCloseBatchModal();
      refreshData();
    },
    successMessage: "Investimento excluída com sucesso",
    errorMessage: "Erro ao excluir investimento"
  });

  const {
    isSubmitting,
    isModalOpen,
    editingItem,
    handleCreate,
    handleEdit,
    handleClose,
    handleSubmit
  } = useCreateOrEditItem<InvestmentModel, any>({
    createFunction: investmentService.createInvestment,
    updateFunction: investmentService.updateInvestment,
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

  const formRef = useRef<InvestmentFormRef>(null);

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
        itemsPerPage={15}
        onPageChange={handlePageChange}
        filterComponent={
          <InvestmentFilters
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
          <InvestmentList
            investments={investments}
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
        title={editingItem?.id ? "Editar Investimento" : "Novo Investimento"}
        confirmText={editingItem?.id ? "Atualizar" : "Criar"}
        cancelText="Cancelar"
        isLoading={isSubmitting}
      >
        <InvestmentForm
          ref={formRef}
          investment={editingItem || undefined}
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
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading...</div>}>
      <InvestmentsPage />
    </Suspense>
  );
}
