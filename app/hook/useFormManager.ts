// app/hooks/useFormManager.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseFormManagerProps<T> {
  initialData: T;
  editingItem?: T | null;
  isEditing: boolean;
  onSubmit: (data: T) => Promise<{ success: boolean; message?: string }>;
  onSuccess: (message: string) => void;
  userId?: string;
}

export function useFormManager<T>({
  initialData,
  editingItem,
  isEditing,
  onSubmit,
  onSuccess,
  userId
}: UseFormManagerProps<T>) {
  const [formData, setFormData] = useState<T>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when editing item changes
  useEffect(() => {
    if (isEditing && editingItem) {
      const normalized = Object.fromEntries(
        Object.entries(editingItem).map(([key, value]) => [
          key,
          value ?? (typeof value === "number" ? 0 : "")
        ])
      ) as T;

      setFormData(normalized);
    } else {
      setFormData({
        ...initialData,
        userId: userId || ''
      });
    }
    setError(null);
  }, [editingItem, isEditing, initialData, userId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await onSubmit(formData);
      
      if (result.success) {
        onSuccess(result.message || (isEditing ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!'));
      } else {
        setError(result.message || 'Erro ao salvar item');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar item');
      console.error('Erro ao salvar item:', err);
    } finally {
      setSubmitting(false);
    }
  }, [formData, onSubmit, onSuccess, userId, isEditing]);

  const updateFormData = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setError(null);
  }, [initialData]);

  return {
    // State
    formData,
    submitting,
    error,
    
    // Actions
    setFormData: updateFormData,
    setSubmitting,
    setError,
    handleSubmit,
    resetForm
  };
}