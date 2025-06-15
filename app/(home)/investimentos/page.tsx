"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Context
import { useAuth } from "@/app/context/AuthContext";

// Services
import { investmentService } from "@/app/services/investmentService";

// Components
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";
import { InvestmentFilters } from "@/app/components/investments/InvestmentFilters";
import { InvestmentList } from "@/app/components/investments/InvestmentList";
import Modal from "@/app/components/Modal";
import { GenericListPage } from "@/app/components/ui/GenericListPage";

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
  const { user } = useAuth();

  const {
    data: investments,
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
  } = usePaginatedData<InvestmentModel, { id: string }>({
    defaultFilters: { type: "", account: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: investmentService.getInvestments,
    userDependency: user ?? { id: '' }
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