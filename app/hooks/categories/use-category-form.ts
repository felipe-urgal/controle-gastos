'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { initialFormData } from '@/app/lib/constants/category.constants';
import type { CategoryFormProps } from '@/app/lib/interface/category.interface';
import { categoryService } from '@/app/services/category-service';

/**
 * Estado, validação e envio do formulário de categoria, independentes da apresentação
 * (wizard mobile ou formulário desktop).
 */
export function useCategoryForm({ category, isEditing }: CategoryFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(() =>
    isEditing && category
      ? {
          name: category.name ?? '',
          type: category.type,
          color: category.color ?? '#3B82F6',
          icon: category.icon ?? 'tag',
          description: category.description ?? '',
          isActive: category.isActive,
        }
      : initialFormData,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleRedirect() {
    if (isEditing && category?.id) {
      router.replace(`/categorias/show/${category.id}`);
    } else {
      router.replace('/categorias');
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        ...formData,
        description: formData.description || null,
      };

      if (isEditing && category) {
        await categoryService.update(category.id, payload);
      } else {
        await categoryService.create(payload);
      }

      handleRedirect();
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.error?.message ||
        error?.data?.error?.message ||
        error?.message;

      setSubmitError(apiMessage || 'Erro ao salvar categoria');
    } finally {
      setIsSubmitting(false);
    }
  }

  return { formData, setFormData, submitError, setSubmitError, isSubmitting, handleSubmit, handleRedirect };
}
