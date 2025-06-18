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

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InvestmentsPage />
    </Suspense>
  );
}

function InvestmentsPage() {
  const {
    data: investments,
    additionalData,
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
  } = usePaginatedData<InvestmentModel>({
    defaultFilters: { type: "", account: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: investmentService.getInvestments,
  });

  const {
    openModal,
    isDeleting,
    handleDeleteClick,
    handleConfirmDelete,
    handleCloseModal,
  } = useDeleteItem({
    deleteFunction: investmentService.deleteInvestment,
    onSuccess: handleClearFilters,
    successMessage: "Investimento excluída com sucesso",
    errorMessage: "Erro ao excluir investimento"
  });

  const buy = additionalData ? (additionalData.buy as string) : "0";
  const dividend = additionalData ? (additionalData.dividend as string) : "0";

  return (
    <ProtectedRoute>
      <GenericListPage
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        breadcrumbComponent={<Breadcrumb loading={isLoading || isLoadingMore} />}
        filterComponent={
          <InvestmentFilters
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
          <InvestmentList
            investments={investments}
            onDelete={handleDeleteClick}
            buy={buy}
            dividend={dividend}
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
    </ProtectedRoute>
  );
}