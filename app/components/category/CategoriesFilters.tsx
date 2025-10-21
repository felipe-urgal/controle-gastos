// app/components/categories/CategoriesFilter.tsx
'use client';

import { CategoryType } from '@/app/types/category';

import { BaseFilter } from '@/app/components';

import { useFilterManager } from '@/app/hook';

interface CategoriesFilterProps {
  filterType: CategoryType | 'ALL' | null;
  filterActive: 'ALL' | 'ACTIVE' | 'INACTIVE' | null;
  onFilterTypeChange: (type: CategoryType | 'ALL' | null) => void;
  onFilterActiveChange: (active: 'ALL' | 'ACTIVE' | 'INACTIVE' | null) => void;
}

export default function CategoriesFilter({
  filterType,
  filterActive,
  onFilterTypeChange,
  onFilterActiveChange,
}: CategoriesFilterProps) {
  const filterManager = useFilterManager<CategoryType | 'ALL'>({
    initialType: filterType,
    initialActive: filterActive,
    onFilterChange: (filters) => {
      onFilterTypeChange(filters.type);
      onFilterActiveChange(filters.active);
    }
  });

  const typeOptions: Array<{ value: CategoryType | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'Todos os tipos' },
    { value: 'EXPENSE', label: 'Despesas' },
    { value: 'INCOME', label: 'Receitas' }
  ];

  return (
    <BaseFilter<CategoryType | 'ALL'>
      filterType={filterManager.filterType}
      filterActive={filterManager.filterActive}
      typeOptions={typeOptions}
      onFilterTypeChange={filterManager.setFilterType}
      onFilterActiveChange={filterManager.setFilterActive}
      onClearFilters={filterManager.clearFilters}
      hasActiveFilters={filterManager.hasActiveFilters}
      typePlaceholder="Filtrar por tipo de categoria"
      activePlaceholder="Filtrar por status"
    />
  );
}