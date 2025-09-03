"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Services
import { categoryService } from "@/app/services/categoryService";

// Components
import { ProtectedRoute, CategoryList, CategoryFilters, Modal, GenericListPage } from "@/app/components";

// Types
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
    totalPages,
    importLoading,
    importModalOpen,
    importPreview,
    handleFileSelect,
    handleConfirmImport,
    handleCancelImport
  } = usePaginatedData<CategoryModel>({
    defaultFilters: {},
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: categoryService.getCategories,
    importFunction: categoryService.importCategories,
    importLog: "category"
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
        filterComponent={
          <CategoryFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            loading={isLoading}
            message={message}
            onFileSelect={handleFileSelect}
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

      <Modal
        isOpen={openModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir este item?"
        confirmText="Excluir"
        isLoading={isDeleting}
      />

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
          <p className="text-sm text-gray-600 mb-4">
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
      <CategoriesPage />
    </Suspense>
  );
}