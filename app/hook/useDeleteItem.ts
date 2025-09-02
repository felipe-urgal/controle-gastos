"use client";

import { useState } from "react";
import { toast } from "react-toastify";

interface UseDeleteItemOptions {
  deleteFunction: (id: string) => Promise<{ success: boolean; message?: string }>;
  deleteBatchFunction?: (ids: string[]) => Promise<{ success: boolean; message?: string; count?: number }>;
  onSuccess?: () => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useDeleteItem(options: UseDeleteItemOptions) {
  const { 
    deleteFunction, 
    deleteBatchFunction, 
    onSuccess, 
    successMessage = "Item excluído com sucesso", 
    errorMessage = "Erro ao excluir item" 
  } = options;
  
  const [itemId, setItemId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [openBatchModal, setOpenBatchModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  const handleDeleteClick = (id: string) => {
    setItemId(id);
    setOpenModal(true);
  };

  const handleDeleteBatchClick = (ids: string[]) => {
    setSelectedIds(ids);
    setOpenBatchModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemId) return;
    
    setIsDeleting(true);
    try {
      const response = await deleteFunction(itemId);

      if (!response.success) {
        throw new Error(response.message || errorMessage);
      }

      toast.success(response.message || successMessage);
      onSuccess?.();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setOpenModal(false);
      setItemId(null);
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteBatch = async () => {
    if (!deleteBatchFunction || selectedIds.length === 0) return;
    
    setIsDeletingBatch(true);
    try {
      const response = await deleteBatchFunction(selectedIds);

      if (!response.success) {
        throw new Error(response.message || errorMessage);
      }

      toast.success(response.message || `${selectedIds.length} itens excluídos com sucesso`);
      onSuccess?.();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setOpenBatchModal(false);
      setSelectedIds([]);
      setIsDeletingBatch(false);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setItemId(null);
  };

  const handleCloseBatchModal = () => {
    setOpenBatchModal(false);
    setSelectedIds([]);
  };

  return {
    openModal,
    openBatchModal,
    isDeleting,
    isDeletingBatch,
    handleDeleteClick,
    handleDeleteBatchClick,
    handleConfirmDelete,
    handleConfirmDeleteBatch,
    handleCloseModal,
    handleCloseBatchModal,
    selectedIds
  };
}