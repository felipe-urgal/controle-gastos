// app/hooks/useListManager.ts
'use client';

import { useState, useCallback } from 'react';

interface UseListManagerProps<T> {
  onDelete?: (items: T[]) => void;
  onToggleActive?: (items: T[]) => void;
  onError?: (error: string) => void;
  onSuccess?: (success: string) => void;
}

export function useListManager<T extends { id: string; isActive: boolean }>({
  onDelete,
  onToggleActive,
  onError,
  onSuccess
}: UseListManagerProps<T> = {}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (
    id: string,
    items: T[],
    deleteService: (id: string) => Promise<{ success: boolean; message?: string }>,
    itemName: string = 'item'
  ) => {
    if (!confirm(`Tem certeza que deseja excluir este(a) ${itemName}?`)) return;

    setDeletingId(id);
    try {
      const result = await deleteService(id);
      if (result.success) {
        const updatedItems = items.filter(item => item.id !== id);
        onDelete?.(updatedItems);
        onSuccess?.(`${itemName} excluído(a) com sucesso!`);
      } else {
        onError?.(result.message || `Erro ao excluir ${itemName}`);
      }
    } catch (err: any) {
      onError?.(err?.message || `Erro ao excluir ${itemName}`);
      console.error(`Erro ao excluir ${itemName}:`, err);
    } finally {
      setDeletingId(null);
    }
  }, [onDelete, onError, onSuccess]);

  const handleToggleActive = useCallback(async (
    item: T,
    items: T[],
    updateService: (item: T) => Promise<T>,
    itemName: string = 'item'
  ) => {
    setTogglingId(item.id);
    try {
      const updatedItem = await updateService({
        ...item,
        isActive: !item.isActive
      });
      const updatedItems = items.map(currentItem => 
        currentItem.id === item.id ? updatedItem : currentItem
      );
      onToggleActive?.(updatedItems);
      onSuccess?.(`${itemName} ${!item.isActive ? 'ativado(a)' : 'desativado(a)'} com sucesso!`);
    } catch (err: any) {
      onError?.(`Erro ao alterar status do(a) ${itemName}`);
      console.error(`Erro ao alterar ${itemName}:`, err);
    } finally {
      setTogglingId(null);
    }
  }, [onToggleActive, onError, onSuccess]);

  return {
    deletingId,
    togglingId,
    handleDelete,
    handleToggleActive
  };
}