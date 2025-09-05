"use client";

// Hooks
import { Suspense, useRef } from "react";
import { usePaginatedData } from "@/app/hook/usePaginatedData"
import { useDeleteItem } from "@/app/hook/useDeleteItem"
import { useCreateOrEditItem } from "@/app/hook/useCreateOrEditItem"

// Services
import { categoryService } from "@/app/services/categoryService";

// Components
import { ProtectedRoute, CategoryList, CategoryFilters, Modal, GenericListPage, CategoryForm } from "@/app/components";

// Types
import { CategoryModel } from '@/app/types/category'
import { CategoryFormRef } from "@/app/components/categories/CategoryForm";

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
    itemsPerLoad: 10,
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

  const formRef = useRef<CategoryFormRef>(null);

  const handleFormSubmit = async (formData: any): Promise<void> => {
    if (!user) return;

    const payload = {
      ...formData,
      userId: user.id
    };

    try {
      await handleSubmit(payload, editingItem?.id);
    } catch (error) {
      console.error("Erro ao criar/editar investimento:", error);
    }
  };

  const handleModalSubmit = async () => {
    if (!formRef.current) return;

    try {
      await formRef.current.submitForm();
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
    }
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
        onConfirm={handleModalSubmit}
        title={editingItem?.id ? "Editar Categoria" : "Novo Categoria"}
        confirmText={editingItem?.id ? "Atualizar" : "Criar"}
        cancelText="Cancelar"
        isLoading={isSubmitting}
      >
        <CategoryForm
          ref={formRef}
          category={editingItem || undefined}
          isEdit={!!editingItem?.id}
          onSubmit={handleFormSubmit}
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