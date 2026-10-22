"use client";

import { useCategories } from "@/app/hooks/categories/category-show";
import { ShowPage } from "@/app/components/base-pages";
import CategoryShowView from '@/app/components/pages/category/show/category-show-view';

export default function Show({ id }: { id: string }) {
  const {
    category,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    deleteError,
    handleDelete,
    handleBack,
  } = useCategories({ id });

  const view = category ? (
    <CategoryShowView
      category={category}
      backUrl={handleBack}
      editUrl={`/categorias/alterar/${id}`}
      isDeleting={isDeleting}
      onDeleteRequest={() => setIsDeleteModalOpen(true)}
    />
  ) : null;

  return (
    <ShowPage
      entity={category}
      entityName="categoria"
      titleFallback="Detalhes da categoria"
      loading={loading}
      editUrl={`/categorias/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      deleteError={deleteError}
      deleteWarning="Categorias com transações, divisões, limites, regras de importação ou modelos vinculados não podem ser excluídas. Para preservar o histórico, você pode inativar a categoria."
      emptyRedirectTo="/categorias"
      hideHeaderDelete
      mobileContent={view}
    >
      {view}
    </ShowPage>
  );
};
