"use client";

import { useCategories } from "@/app/hooks/categories/category-show";
import { EntityShowPage } from "@/app/components/pages";
import { CategoryInfo } from "@/app/components/category";

export default function Show({ id }: { id: string }) {
  const {
    category,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
  } = useCategories({ id });

  return (
    <EntityShowPage
      entity={category}
      entityName="categoria"
      loading={loading}
      editUrl={`/categorias/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      emptyRedirectTo="/categorias"
    >
      <CategoryInfo
        category={category!}
        isDeleting={isDeleting}
      />
    </EntityShowPage>
  );
};
