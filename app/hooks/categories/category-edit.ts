"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { categoryService } from "@/app/services/categoryService";
import { CategoryModel } from "@/app/types/category";

export function useCategories({ id }: { id: string }) {
  const router = useRouter();

  const [category, setCategory] = useState<CategoryModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await categoryService.getById(String(id));
        setCategory(response.data);
      } catch {
        setError('Não foi possível carregar os dados da categoria');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleBack = () => {
    router.push(`/categorias/show/${id}`);
  };

  return {
    category,
    loading,
    error,
    handleBack
  };
};
