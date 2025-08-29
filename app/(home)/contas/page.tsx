"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Services
import { accountService } from "@/app/services/accountService";

// Components
import { Breadcrumb, ProtectedRoute, Modal, AccountFilters, AccountList, GenericListPage } from "@/app/components";

// Types
import { AccountModel } from '@/app/types/account'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountsPage />
    </Suspense>
  );
}

function AccountsPage() {
  const {
    data: accounts,
    isLoading,
    isLoadingMore,
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
  } = usePaginatedData<AccountModel>({
    defaultFilters: { type: "" },
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: accountService.getAccounts,
  });

  const {
    openModal,
    isDeleting,
    handleDeleteClick,
    handleConfirmDelete,
    handleCloseModal,
  } = useDeleteItem({
    deleteFunction: accountService.deleteAccount,
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
        itemsPerPage={15} // Mesmo valor que itemsPerLoad
        onPageChange={handlePageChange} // Passe a função de mudança de página
        breadcrumbComponent={<Breadcrumb loading={isLoading || isLoadingMore} />}
        filterComponent={
          <AccountFilters
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
          <AccountList
            accounts={accounts}
            onDelete={handleDeleteClick}
          />
        }
      />

      <Modal
        isOpen={openModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta conta?"
        confirmText="Excluir"
        isLoading={isDeleting}
      />
    </ProtectedRoute>
  );
}