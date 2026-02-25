"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { categoryService } from "@/app/services/categoryService";
import { CategoryModel } from "@/app/types/category";

export function useCategories() {
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await categoryService.getAll();
      setCategories(response.data?.items || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const processedCategories = useMemo(() => {
    let result = [...categories];

    if (search) {
      result = result.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return result;
  }, [categories, search]);

  return {
    loading,
    processedCategories,
    search,
    setSearch,
    viewMode,
    setViewMode,
  };
}