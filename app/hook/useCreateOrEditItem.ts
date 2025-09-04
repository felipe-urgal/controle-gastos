// app/hook/useCreateOrEditItem.ts
"use client";

import { useState } from "react";
import { toast } from "react-toastify";

interface UseCreateOrEditItemOptions<T, U> {
  createFunction: (data: U) => Promise<T>;
  updateFunction: (data: U & { id: string }) => Promise<T>;
  successMessage?: {
    create?: string;
    update?: string;
  };
  errorMessage?: {
    create?: string;
    update?: string;
  };
  onSuccess?: (data?: T, isEdit?: boolean) => void;
  onError?: (error: Error, isEdit?: boolean) => void;
}

export function useCreateOrEditItem<T, U>(options: UseCreateOrEditItemOptions<T, U>) {
  const {
    createFunction,
    updateFunction,
    successMessage = {
      create: "Item criado com sucesso!",
      update: "Item atualizado com sucesso!"
    },
    errorMessage = {
      create: "Erro ao criar item",
      update: "Erro ao atualizar item"
    },
    onSuccess,
    onError
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: T) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (formData: U, itemId?: string) => {
    setIsSubmitting(true);
      
    const isEdit = !!itemId;

    try {
      let response;

      if (isEdit) {
        response = await updateFunction({ ...formData, id: itemId } as U & { id: string });
      } else {
        response = await createFunction(formData);
      }

      if (!response.success) {
        throw new Error(response.message || (isEdit ? errorMessage.update : errorMessage.create));
      }

      const successMsg = response.message || (isEdit ? successMessage.update : successMessage.create);
      toast.success(successMsg);

      onSuccess?.(response.data, isEdit);
      
      return { success: true, data: response.data };
    } catch (error) {
      const errorMsg = (error as Error).message || (isEdit ? errorMessage.update : errorMessage.create);
      toast.error(errorMsg);
      
      onError?.(error as Error, !!itemId);
      
      return { success: false, error: error as Error };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    isModalOpen,
    editingItem,
    handleCreate,
    handleEdit,
    handleClose,
    handleSubmit,
    setEditingItem
  };
}
