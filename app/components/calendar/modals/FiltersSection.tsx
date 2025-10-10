"use client"

import { useState } from 'react';
import { HiFilter, HiX } from "react-icons/hi";
import { useThemeColors } from "@/app/hook/useThemeColors";
import { Input, Select, Button } from "@/app/components"

interface FiltersSectionProps {
  searchTerm?: string;
  filterType?: string;
  filterCategory?: string;
  sortBy?: string;
  sortOrder?: string;
  categories?: any[];
  onSearchChange?: (value: string) => void;
  onFilterTypeChange?: (value: string) => void;
  onFilterCategoryChange?: (value: string) => void;
  onSortChange?: (field: string, order: string) => void;
  onClearFilters?: () => void;
  className?: string;
  showSearch?: boolean;
  showTypeFilter?: boolean;
  showCategoryFilter?: boolean;
  showSort?: boolean;
}

export default function FiltersSection({
  searchTerm = "",
  filterType = "",
  filterCategory = "",
  sortBy = "",
  sortOrder = "",
  categories = [],
  onSearchChange,
  onFilterTypeChange,
  onFilterCategoryChange,
  onSortChange,
  onClearFilters,
  className = "",
  showSearch = true,
  showTypeFilter = true,
  showCategoryFilter = true,
  showSort = true
}: FiltersSectionProps) {
  const [showFilters, setShowFilters] = useState(false);
  const theme = useThemeColors();

  // Opções para o select de tipo
  const typeOptions = [
    { value: 'INCOME', label: 'Receitas' },
    { value: 'EXPENSE', label: 'Despesas' }
  ]

  // Opções para o select de categoria
  const categoryOptions = [
    ...categories.map(category => ({
      value: category.id || category.value,
      label: category.name || category.label
    }))
  ];

  // Opções para o select de ordenação
  const sortOptions = [
    { value: 'description-asc', label: 'Descrição (A-Z)' },
    { value: 'description-desc', label: 'Descrição (Z-A)' },
    { value: 'amount-desc', label: 'Valor (maior primeiro)' },
    { value: 'amount-asc', label: 'Valor (menor primeiro)' },
  ];

  const hasFilters = showTypeFilter || showCategoryFilter || showSort;
  const currentSortValue = sortBy && sortOrder ? `${sortBy}-${sortOrder}` : '';
  
  // Verifica se há algum filtro ativo
  const hasActiveFilters = searchTerm || filterType || filterCategory || sortBy;

  const handleClearFilters = () => {
    onSearchChange?.('');
    onFilterTypeChange?.('');
    onFilterCategoryChange?.('');
    onSortChange?.('', '');
    onClearFilters?.();
  };

  const handleSortChange = (value: string) => {
    if (value === '') {
      onSortChange?.('', '');
    } else {
      const [field, order] = value.split('-');
      onSortChange?.(field, order);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        {/* Search and Toggle */}
        <div className="flex gap-2 items-center">
          {showSearch && (
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                icon={<HiFilter className="w-4 h-4" />}
                variant="outlined"
                size="sm"
                className="w-full"
              />
            </div>
          )}
          
          {hasFilters && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 border ${theme.border.primary} rounded-lg ${theme.state.hover} transition-colors flex items-center justify-center ${
                  showFilters ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : ''
                }`}
                title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
              >
                <HiFilter className={`w-4 h-4 ${showFilters ? 'text-blue-500' : theme.text.tertiary}`} />
              </button>
              
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClearFilters}
                  icon={<HiX size={14} />}
                  className="!p-2"
                  title="Limpar todos os filtros"
                />
              )}
            </div>
          )}
        </div>

        {/* Filters Grid */}
        {showFilters && hasFilters && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 ${theme.bg.secondary} rounded-lg border ${theme.border.primary}`}>
            {showTypeFilter && (
              <Select
                options={typeOptions}
                value={filterType}
                onChange={(value) => onFilterTypeChange?.(value?.toString() || '')}
                variant="outlined"
                size="sm"
                label="Tipo de transação"
                className="w-full"
                placeholder="Todos os tipos"
              />
            )}

            {showCategoryFilter && categories.length > 0 && (
              <Select
                options={categoryOptions}
                value={filterCategory}
                onChange={(value) => onFilterCategoryChange?.(value?.toString() || '')}
                variant="outlined"
                size="sm"
                label="Categoria"
                className="w-full"
                searchable={true}
                searchPlaceholder="Buscar categoria..."
                placeholder="Todas categorias"
              />
            )}

            {showSort && (
              <Select
                options={sortOptions}
                value={currentSortValue}
                onChange={(value) => handleSortChange(value?.toString() || '')}
                variant="outlined"
                size="sm"
                label="Ordenar por"
                className="w-full"
                placeholder="Ordenar por..."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
