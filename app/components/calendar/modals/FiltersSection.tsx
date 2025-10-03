"use client"

import { useState } from 'react';
import { HiFilter } from "react-icons/hi";
import { useThemeColors } from "@/app/hook/useThemeColors";
import { Input, Select } from "@/app/components"

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
  className?: string;
  showSearch?: boolean;
  showTypeFilter?: boolean;
  showCategoryFilter?: boolean;
  showSort?: boolean;
}

export default function FiltersSection({
  searchTerm = "",
  filterType = "ALL",
  filterCategory = "ALL",
  sortBy = "date",
  sortOrder = "desc",
  categories = [],
  onSearchChange,
  onFilterTypeChange,
  onFilterCategoryChange,
  onSortChange,
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
    { value: 'ALL', label: 'Todos os tipos' },
    { value: 'INCOME', label: 'Receitas' },
    { value: 'EXPENSE', label: 'Despesas' }
  ]

  // Opções para o select de categoria
  const categoryOptions = [
    { value: 'ALL', label: 'Todas categorias' },
    ...categories.map(category => ({
      value: category.id || category.value,
      label: category.name || category.label
    }))
  ];

  // Opções para o select de ordenação
  const sortOptions = [
    { value: 'date-desc', label: 'Data (mais recente)' },
    { value: 'date-asc', label: 'Data (mais antiga)' },
    { value: 'description-asc', label: 'Descrição (A-Z)' },
    { value: 'description-desc', label: 'Descrição (Z-A)' },
    { value: 'amount-desc', label: 'Valor (maior)' },
    { value: 'amount-asc', label: 'Valor (menor)' }
  ];

  const hasFilters = showTypeFilter || showCategoryFilter || showSort;
  const currentSortValue = `${sortBy}-${sortOrder}`;

  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        {/* Search and Toggle */}
        <div className="flex gap-2">
          {showSearch && (
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar..."
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border ${theme.border.primary} rounded-lg ${theme.state.hover} transition-colors flex items-center justify-center`}
              title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            >
              <HiFilter className={`w-4 h-4 ${theme.text.tertiary} ${showFilters ? 'text-blue-500' : ''}`} />
            </button>
          )}
        </div>

        {/* Filters Grid */}
        {showFilters && hasFilters && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 ${theme.bg.secondary} rounded-lg border ${theme.border.primary}`}>
            {showTypeFilter && (
              <Select
                options={typeOptions}
                value={filterType}
                onChange={(value) => onFilterTypeChange?.(value.toString())}
                variant="outlined"
                size="sm"
                label="Tipo"
                className="w-full"
              />
            )}

            {showCategoryFilter && categories.length > 0 && (
              <Select
                options={categoryOptions}
                value={filterCategory}
                onChange={(value) => onFilterCategoryChange?.(value.toString())}
                variant="outlined"
                size="sm"
                label="Categoria"
                className="w-full"
                searchable={true}
                searchPlaceholder="Buscar categoria..."
              />
            )}

            {showSort && (
              <Select
                options={sortOptions}
                value={currentSortValue}
                onChange={(value) => {
                  const [field, order] = value.toString().split('-');
                  onSortChange?.(field, order);
                }}
                variant="outlined"
                size="sm"
                label="Ordenar por"
                className={showTypeFilter && showCategoryFilter ? 'sm:col-span-2' : 'w-full'}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
