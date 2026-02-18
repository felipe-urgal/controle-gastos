"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context";
import { categoryService } from "@/app/services";
import { CategoryModel } from "@/app/types/category";

export function useCategories() {
  const { user } = useAuth();

  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await categoryService.getCategories(user.id);
      setCategories(response.data?.items || []);
    } catch (err) {
      setError("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const removeCategoryFromState = (id: string) => {
    setCategories(prev =>
      prev.filter(category => category.id !== id)
    );
  };

  const updateCategoryInState = (updatedCategory: CategoryModel) => {
    setCategories(prev =>
      prev.map(category =>
        category.id === updatedCategory.id
          ? updatedCategory
          : category
      )
    );
  };

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    removeCategoryFromState,
    updateCategoryInState
  };
}