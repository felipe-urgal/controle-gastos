"use client";

// Hooks
import { Suspense } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"
import { useCreateOrEditItem } from "@/app/hook/useCreateOrEditItem"

// Services
import { categoryService } from "@/app/services/categoryService";

// Components
import { ProtectedRoute, CategoryList, CategoryFilters, Modal, GenericListPage, CategoryForm } from "@/app/components";

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
    handleCancelImport,
    refreshData,
    user
  } = usePaginatedData<CategoryModel>({
    defaultFilters: {},
    itemsPerLoad: 15,
    debounceDelay: 500,
    fetchFunction: categoryService.getCategories,
    importFunction: categoryService.importCategories,
    importLog: "category"
  });

  const {
    openBatchModal,
    isDeletingBatch,
    handleDeleteBatchClick,
    handleConfirmDeleteBatch,
    handleCloseBatchModal,
    selectedIds
  } = useDeleteItem({
    deleteFunction: categoryService.deleteCategory,
    deleteBatchFunction: categoryService.deleteCategoryBatch,
    onSuccess: () => {
      handleClearFilters();
      refreshData();
    },
    successMessage: "Categoria excluída com sucesso",
    errorMessage: "Erro ao excluir categoria"
  });

  // Usando o novo hook
  const {
    isSubmitting,
    isModalOpen,
    editingItem,
    handleCreate,
    handleEdit,
    handleClose,
    handleSubmit
  } = useCreateOrEditItem<CategoryModel, { name: string; userId: string }>({
    createFunction: categoryService.createCategory,
    updateFunction: categoryService.updateCategory,
    successMessage: {
      create: "Categoria criada com sucesso!",
      update: "Categoria atualizada com sucesso!"
    },
    errorMessage: {
      create: "Erro ao criar categoria",
      update: "Erro ao atualizar categoria"
    },
    onSuccess: () => {
      handleClose();
      refreshData();
    }
  });

  const handleFormSubmit = async (formData: { name: string }) => {
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
        itemsPerPage={15}
        onPageChange={handlePageChange}
        filterComponent={
          <CategoryFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            onCreate={handleCreate}
            loading={isLoading}
            message={message}
            onFileSelect={handleFileSelect}
          />
        }
        listComponent={
          <CategoryList
            categories={categories}
            onDeleteBatch={handleDeleteBatchClick}
            isDeleting={isDeletingBatch}
            onEdit={handleEdit}
          />
        }
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        size="lg"
        title={editingItem?.id ? "Editar Categoria" : "Nova Categoria"}
        hideActions={true}
      >
        <CategoryForm
          category={editingItem || undefined}
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