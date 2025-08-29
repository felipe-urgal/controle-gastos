"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Services
import { categoryService } from "@/app/services/categoryService";

// Components
import { Breadcrumb, ProtectedRoute, CategoryList, CategoryFilters, Modal, GenericListPage } from "@/app/components";

// Types
import { CategoryModel } from '@/app/types/category'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoriesPage />
    </Suspense>
  );
}

function CategoriesPage() {
  const {
    data: categories,
    isLoading,
    isLoadingMore,
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
    isDeleting,
    handleDeleteClick,
    handleConfirmDelete,
    handleCloseModal,
  } = useDeleteItem({
    deleteFunction: categoryService.deleteCategory,
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
        itemsPerPage={15} // Mesmo valor que itemsPerLoad
        onPageChange={handlePageChange} // Passe a função de mudança de página
        breadcrumbComponent={<Breadcrumb loading={isLoading || isLoadingMore} />}
        filterComponent={
          <CategoryFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            loading={isLoading || isLoadingMore}
            message={message}
          />
        }
        listComponent={
          <CategoryList
            categories={categories}
            onDelete={handleDeleteClick}
          />
        }
      />

      <Modal
        isOpen={openModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta categoria?"
        confirmText="Excluir"
        isLoading={isDeleting}
      />
    </ProtectedRoute>
  );
}