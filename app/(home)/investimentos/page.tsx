"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"
import { useCreateOrEditItem } from "@/app/hook/useCreateOrEditItem"

// Services
import { investmentService } from "@/app/services/investmentService";

// Components
import { ProtectedRoute, InvestmentFilters, InvestmentList, Modal, GenericListPage, InvestmentForm } from "@/app/components";

// Types
import { InvestmentModel } from '@/app/types/investment'

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
    importLoading,
    importModalOpen,
    importPreview,
    handleFileSelect,
    handleConfirmImport,
    handleCancelImport,
    refreshData,
    user
  } = usePaginatedData<InvestmentModel>({
    defaultFilters: { type: "", account: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: investmentService.getInvestments,
    importFunction: investmentService.importInvestments,
    importLog: "investments"
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
    onSuccess: handleClearFilters,
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
      update: "Investimento atualizad0 com sucesso!"
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
        itemsPerPage={15} // Mesmo valor que itemsPerLoad
        onPageChange={handlePageChange} // Passe a função de mudança de página
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
        size="lg"
        title={editingItem?.id ? "Editar Investimento" : "Novo Investimento"}
        hideActions={true}
      >
        <InvestmentForm
          investment={editingItem || undefined}
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <InvestmentsPage />
    </Suspense>
  );
}
