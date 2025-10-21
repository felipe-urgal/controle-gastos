// app/hooks/useModalManager.ts
'use client';

import { useState, useCallback, useMemo } from 'react';

interface ModalManagerState<T> {
  items: T[];
  isEditing: boolean;
  currentItem: T | null;
  showForm: boolean;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  success: string | null;
}

interface UseModalManagerProps<T> {
  fetchItems: () => Promise<T[]>;
  userId?: string;
  initialFilter?: any;
}

export function useModalManager<T>({
  fetchItems,
  userId,
  initialFilter = 'ALL'
}: UseModalManagerProps<T>) {
  const [state, setState] = useState<ModalManagerState<T>>({
    items: [],
    isEditing: false,
    currentItem: null,
    showForm: false,
    loading: false,
    submitting: false,
    error: null,
    success: null
  });

  const [filterType, setFilterType] = useState<any>(initialFilter);
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const filteredItems = useMemo(() => {
    return state.items.filter((item: any) => {
      const typeMatch = filterType === 'ALL' || item.type === filterType;
      const activeMatch = filterActive === 'ALL' || 
        (filterActive === 'ACTIVE' && item.isActive) ||
        (filterActive === 'INACTIVE' && !item.isActive);
      
      return typeMatch && activeMatch;
    });
  }, [state.items, filterType, filterActive]);

  const loadItems = useCallback(async () => {
    if (!userId) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const items = await fetchItems();
      setState(prev => ({ ...prev, items, loading: false }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar itens';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      console.error('Erro ao carregar itens:', err);
    }
  }, [fetchItems, userId]);

  const resetFormState = useCallback(() => {
    setState(prev => ({
      ...prev,
      showForm: false,
      isEditing: false,
      currentItem: null,
      error: null,
      success: null
    }));
    setFilterType(initialFilter);
    setFilterActive('ALL');
  }, [initialFilter]);

  const handleAddNew = useCallback(() => {
    setState(prev => ({
      ...prev,
      showForm: true,
      isEditing: false,
      currentItem: null,
      error: null,
      success: null
    }));
  }, []);

  const handleEdit = useCallback((item: T) => {
    setState(prev => ({
      ...prev,
      currentItem: item,
      isEditing: true,
      showForm: true,
      error: null,
      success: null
    }));
  }, []);

  const handleBackToList = useCallback(() => {
    setState(prev => ({
      ...prev,
      showForm: false,
      isEditing: false,
      currentItem: null,
      error: null
    }));
    // Clear success after delay
    setTimeout(() => {
      setState(prev => ({ ...prev, success: null }));
    }, 2000);
  }, []);

  const handleSuccess = useCallback((message: string) => {
    setState(prev => ({ ...prev, success: message }));
    loadItems();
    handleBackToList();
  }, [loadItems, handleBackToList]);

  const handleItemsUpdate = useCallback((updatedItems: T[]) => {
    setState(prev => ({ ...prev, items: updatedItems }));
    loadItems();
  }, [loadItems]);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, error: null, success: null }));
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setState(prev => ({ ...prev, submitting }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setSuccess = useCallback((success: string | null) => {
    setState(prev => ({ ...prev, success }));
  }, []);

  // Função wrapper para setFilterActive que aceita null
  const handleFilterActiveChange = useCallback((active: 'ALL' | 'ACTIVE' | 'INACTIVE' | null) => {
    if (active !== null) {
      setFilterActive(active);
    }
  }, []);

  // Função wrapper para setFilterType que aceita null
  const handleFilterTypeChange = useCallback((type: any) => {
    if (type !== null) {
      setFilterType(type);
    }
  }, []);

  return {
    // State
    ...state,
    filteredItems,
    filterType,
    filterActive,
    
    // Actions
    loadItems,
    resetFormState,
    handleAddNew,
    handleEdit,
    handleBackToList,
    handleSuccess,
    handleItemsUpdate,
    clearMessages,
    
    // Setters
    setSubmitting,
    setError,
    setSuccess,
    setFilterType: handleFilterTypeChange, // Usar a versão wrapper
    setFilterActive: handleFilterActiveChange // Usar a versão wrapper
  };
}