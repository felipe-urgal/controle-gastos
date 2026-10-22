'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { initialFormData } from '@/app/lib/constants/category.constants';
import type { CategoryFormProps } from '@/app/lib/interface/category.interface';
import { isMonthlyLimitInvalid, readMonthlyLimit } from '@/app/components/pages/category/form/category-form-model';
import { categoryLimitService } from '@/app/services/category-limit-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
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
  // Limite mensal opcional, só na criação de despesa; não faz parte do cadastro da categoria.
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [limitCurrency, setLimitCurrency] = useState<SupportedCurrency>('BRL');
  // Se o limite falhar depois de a categoria ser criada, um novo envio só repete o limite.
  const createdCategoryId = useRef<string | null>(null);

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
      if (!isEditing && formData.type === 'EXPENSE' && isMonthlyLimitInvalid(monthlyLimit)) {
        setSubmitError('Informe um limite mensal válido ou deixe o campo em branco.');
        return;
      }

      const payload = {
        ...formData,
        description: formData.description || null,
      };

      if (isEditing && category) {
        await categoryService.update(category.id, payload);
      } else {
        if (!createdCategoryId.current) {
          const created = await categoryService.create(payload);
          createdCategoryId.current = created.data.id;
        }

        const limit = readMonthlyLimit({ type: formData.type, value: monthlyLimit, currency: limitCurrency });
        if (limit) {
          try {
            await categoryLimitService.save({ categoryId: createdCategoryId.current, ...limit });
          } catch (limitError) {
            const reason = limitError instanceof Error ? limitError.message : 'erro desconhecido';
            setSubmitError(`A categoria foi criada, mas o limite não foi salvo (${reason}). Tente de novo ou defina o limite na lista de categorias.`);
            return;
          }
        }
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

  return {
    formData,
    setFormData,
    monthlyLimit,
    setMonthlyLimit,
    limitCurrency,
    setLimitCurrency,
    submitError,
    setSubmitError,
    isSubmitting,
    handleSubmit,
    handleRedirect,
  };
}
