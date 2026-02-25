"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { categoryService } from "@/app/services/categoryService";
import { CategoryModel } from "@/app/types/category";

export function useCategories({ id }: { id: string }) {
  const router = useRouter();

  const [category, setCategory] = useState<CategoryModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await categoryService.getById(String(id));
        setCategory(response.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!category) return;
    try {
      setIsDeleting(true);
      await categoryService.delete(category.id);
      router.push("/categorias");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  const handleBack = () => {
    router.push('/categorias');
  };

  return {
    category,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
  };
};
