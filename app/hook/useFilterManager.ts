// app/hooks/useFilterManager.ts
'use client';

import { useState, useCallback, useMemo } from 'react';

interface UseFilterManagerProps<T> {
  initialType?: T | 'ALL' | null;
  initialActive?: 'ALL' | 'ACTIVE' | 'INACTIVE' | null;
  onFilterChange?: (filters: {
    type: T | 'ALL' | null;
    active: 'ALL' | 'ACTIVE' | 'INACTIVE' | null;
  }) => void;
}

export function useFilterManager<T>({
  initialType = 'ALL',
  initialActive = 'ALL',
  onFilterChange
}: UseFilterManagerProps<T> = {}) {
  const [filterType, setFilterType] = useState<T | 'ALL' | null>(initialType);
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | null>(initialActive);

  const handleTypeChange = useCallback((type: T | 'ALL' | null) => {
    setFilterType(type);
    onFilterChange?.({
      type,
      active: filterActive
    });
  }, [filterActive, onFilterChange]);

  const handleActiveChange = useCallback((active: 'ALL' | 'ACTIVE' | 'INACTIVE' | null) => {
    setFilterActive(active);
    onFilterChange?.({
      type: filterType,
      active
    });
  }, [filterType, onFilterChange]);

  const clearFilters = useCallback(() => {
    setFilterType('ALL');
    setFilterActive('ALL');
    onFilterChange?.({
      type: 'ALL',
      active: 'ALL'
    });
  }, [onFilterChange]);

  const hasActiveFilters = useMemo(() => {
    return filterType !== 'ALL' || filterActive !== 'ALL';
  }, [filterType, filterActive]);

  return {
    // Estado
    filterType,
    filterActive,
    
    // Ações
    setFilterType: handleTypeChange,
    setFilterActive: handleActiveChange,
    clearFilters,
    
    // Utilitários
    hasActiveFilters
  };
}