"use client";

import { useCategories } from "@/app/hooks/categories/category-show";
import { ShowPage } from "@/app/components/base-pages";
import { CategoryInfo } from "@/app/components/pages/category";
import MobileCategoryShow from "@/app/components/pages/category/show/mobile-category-show";

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
      mobileContent={
        category ? (
          <MobileCategoryShow
            category={category}
            backUrl={handleBack}
            editUrl={`/categorias/alterar/${id}`}
            isDeleting={isDeleting}
            onDeleteRequest={() => setIsDeleteModalOpen(true)}
          />
        ) : null
      }
    >
      <CategoryInfo
        category={category!}
        isDeleting={isDeleting}
      />
    </ShowPage>
  );
};
