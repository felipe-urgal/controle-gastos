"use client";

import { categoryService } from "@/app/services/category-service";
import { CategoryModel } from "@/app/types/category";
import { useShow } from "@/app/hooks/crud/show";
import { useDelete } from "@/app/hooks/crud/delete";

export function useCategories({ id }: { id: string }) {
  const { entity: category, loading } =
    useShow<CategoryModel>({
      id,
      service: categoryService,
    });

  const handleBack = "/categorias";

  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  } = useDelete({
    redirectPath: handleBack,
    deleteService: categoryService.delete,
  });

  return {
    category,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete: () =>
      category && handleDelete(category.id),
    handleBack,
  };
};
