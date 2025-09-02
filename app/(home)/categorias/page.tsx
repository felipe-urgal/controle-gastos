"use client";

import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"
import { categoryService } from "@/app/services/categoryService";
import { Breadcrumb, ProtectedRoute, CategoryList, CategoryFilters, Modal, GenericListPage } from "@/app/components";
import { CategoryModel } from '@/app/types/category'

function CategoriesPage() {
  const {
    data: categories,
    isLoading,
    message,
    searchTerm,
    handleSearchChange,
    handleClearFilters,
    handlePageChange,
    currentPage,
    totalItems,
    totalPages
  } = usePaginatedData<CategoryModel>({
    defaultFilters: {},
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: categoryService.getCategories,
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
    deleteFunction: categoryService.deleteCategory,
    deleteBatchFunction: categoryService.deleteCategoryBatch,
    onSuccess: handleClearFilters,
    successMessage: "Categoria excluída com sucesso",
    errorMessage: "Erro ao excluir categoria"
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
        breadcrumbComponent={<Breadcrumb loading={isLoading} />}
        filterComponent={
          <CategoryFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            loading={isLoading}
            message={message}
          />
        }
        listComponent={
          <CategoryList
            categories={categories}
            onDelete={handleDeleteClick}
            onDeleteBatch={handleDeleteBatchClick}
            isDeleting={isDeleting || isDeletingBatch}
          />
        }
      />

      {/* Modal para delete único */}
      <Modal
        isOpen={openModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta categoria?"
        confirmText="Excluir"
        isLoading={isDeleting}
      />

      {/* Modal para delete em lote */}
      <Modal
        isOpen={openBatchModal}
        onClose={handleCloseBatchModal}
        onConfirm={handleConfirmDeleteBatch}
        mensagem={`Tem certeza que deseja excluir ${selectedIds.length} categoria${selectedIds.length !== 1 ? 's' : ''}?`}
        confirmText={`Excluir ${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''}`}
        isLoading={isDeletingBatch}
      />
    </ProtectedRoute>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoriesPage />
    </Suspense>
  );
}