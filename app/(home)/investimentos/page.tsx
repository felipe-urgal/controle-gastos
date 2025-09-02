"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Services
import { investmentService } from "@/app/services/investmentService";

// Components
import { ProtectedRoute, Breadcrumb, InvestmentFilters, InvestmentList, Modal, GenericListPage } from "@/app/components";

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
    totalPages
  } = usePaginatedData<InvestmentModel>({
    defaultFilters: { type: "", account: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: investmentService.getInvestments,
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
    deleteBatchFunction: investmentService.deleteInvestmentBatch,
    deleteFunction: investmentService.deleteInvestment,
    onSuccess: handleClearFilters,
    successMessage: "Investimento excluída com sucesso",
    errorMessage: "Erro ao excluir investimento"
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
        breadcrumbComponent={<Breadcrumb loading={isLoading} />}
        filterComponent={
          <InvestmentFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            loading={isLoading}
            message={message}
          />
        }
        listComponent={
          <InvestmentList
            investments={investments}
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
        mensagem="Tem certeza que deseja excluir este investimento?"
        confirmText="Excluir"
        isLoading={isDeleting}
      />

      <Modal
        isOpen={openBatchModal}
        onClose={handleCloseBatchModal}
        onConfirm={handleConfirmDeleteBatch}
        mensagem={`Tem certeza que deseja excluir ${selectedIds.length} investimento${selectedIds.length !== 1 ? 's' : ''}?`}
        confirmText={`Excluir ${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''}`}
        isLoading={isDeletingBatch}
      />
    </ProtectedRoute>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InvestmentsPage />
    </Suspense>
  );
}
