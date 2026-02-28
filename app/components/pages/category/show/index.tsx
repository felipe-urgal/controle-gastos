"use client";

import { useCategories } from "@/app/hooks/categories/category-show";
import { ShowPage } from "@/app/components/base-pages";
import { CategoryInfo } from "@/app/components/pages/category";

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
    <ShowPage
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
    </ShowPage>
  );
};
