"use client";

import { categoryService } from "@/app/services/categoryService";
import { CategoryModel } from "@/app/types/category";
import { useShow } from "@/app/hooks/crud/show";
import { useDelete } from "@/app/hooks/crud/delete";
import { useRouter } from "next/navigation";

export function useCategories({ id }: { id: string }) {
  const router = useRouter();

  const { entity: category, loading } =
    useShow<CategoryModel>({
      id,
      service: categoryService,
    });

  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  } = useDelete({
    redirectPath: "/categorias",
    deleteService: categoryService.delete,
  });

  const handleBack = () => {
    router.push("/categorias");
  };

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
