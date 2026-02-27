"use client";

import { categoryService } from "@/app/services/categoryService";
import { CategoryModel } from "@/app/types/category";
import { useEdit } from "@/app/hooks/crud/edit";

export function useCategories({ id }: { id: string }) {
  const { entity, ...rest } = useEdit<CategoryModel>({
    id,
    service: categoryService,
    backPath: `/categorias/show/${id}`,
    errorMessage: "Não foi possível carregar os dados da categoria",
  });

  return {
    category: entity,
    ...rest,
  };
};
