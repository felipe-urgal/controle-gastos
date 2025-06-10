"use client";

import { useState } from "react";
import { toast } from "react-toastify";

interface UseDeleteItemOptions {
  deleteFunction: (id: string) => Promise<{ success: boolean; message?: string }>;
  onSuccess?: () => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useDeleteItem(options: UseDeleteItemOptions) {
  const { deleteFunction, onSuccess, successMessage, errorMessage } = options;
  
  const [itemId, setItemId] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (id: string) => {
    setItemId(id);
    setOpenModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemId) return;
    
    setIsDeleting(true);
    try {
      const response = await deleteFunction(itemId);

      if (!response.success) {
        throw new Error(response.message || errorMessage || 'Failed to delete item');
      }

      toast.success(successMessage || "Item deleted successfully");
      onSuccess?.();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setOpenModal(false);
      setItemId(null);
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setItemId(null);
  };

  return {
    openModal,
    isDeleting,
    handleDeleteClick,
    handleConfirmDelete,
    handleCloseModal,
  };
}