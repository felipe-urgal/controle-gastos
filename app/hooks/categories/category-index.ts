"use client";

import { categoryService } from "@/app/services/category-service";
import { CategoryModel } from "@/app/types/category";
import { useIndex } from "@/app/hooks/crud/index";

export function useCategories() {
  const { items, ...rest } = useIndex<CategoryModel>({
    service: categoryService,
    pagination: true,
  });

  return {
    categories: items,
    ...rest,
  };
};
