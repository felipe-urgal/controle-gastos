"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"

// Context
import { useAuth } from "@/app/context/AuthContext";

// Services
import { categoryService } from "@/app/services/categoryService";

// Components
import Breadcrumb from "@/app/components/Breadcrumb";
import Modal from "@/app/components/Modal";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { CategoryFilters } from "@/app/components/categories/CategoryFilters";
import { CategoryList } from "@/app/components/categories/CategoryList";
import { GenericListPage } from "@/app/components/ui/GenericListPage";

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
  const { user } = useAuth();
  
  const {
    data: categories,
    isLoading,
    isLoadingMore,
    hasMore,
    message,
    searchTerm,
    handleSearchChange,
    handleClearFilters,
    handleLoadMore,
  } = usePaginatedData<CategoryModel, { id: string }>({
    defaultFilters: {},
    itemsPerLoad: 5,
    debounceDelay: 500,
    fetchFunction: categoryService.getCategories,
    userDependency: user ?? { id: '' }
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
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
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