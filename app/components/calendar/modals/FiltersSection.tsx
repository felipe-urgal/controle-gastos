"use client"

import { useState } from 'react';
import { HiFilter } from "react-icons/hi";
import { useTheme } from "@/app/context/ThemeContext";
import { Category } from "@/app/types/calendar";
import { Input, Select } from "@/app/components"

interface FiltersSectionProps {
  activeTab: 'transactions' | 'investments';
  searchTerm: string;
  filterType: 'ALL' | 'INCOME' | 'EXPENSE';
  filterCategory: string;
  sortBy: 'date' | 'amount' | 'description';
  sortOrder: 'asc' | 'desc';
  categories: Category[];
  onSearchChange: (value: string) => void;
  onFilterTypeChange: (value: 'ALL' | 'INCOME' | 'EXPENSE') => void;
  onFilterCategoryChange: (value: string) => void;
  onSortChange: (field: 'date' | 'amount' | 'description', order: 'asc' | 'desc') => void;
}

export default function FiltersSection({
  activeTab,
  searchTerm,
  filterType,
  filterCategory,
  sortBy,
  sortOrder,
  categories,
  onSearchChange,
  onFilterTypeChange,
  onFilterCategoryChange,
  onSortChange
}: FiltersSectionProps) {
  const [showFilters, setShowFilters] = useState(false);
  const { resolvedTheme } = useTheme();

  const colors = {
    bg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    inputBg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
    inputBorder: resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-300',
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500',
    hover: resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
  };

  // Opções para o select de tipo
  const typeOptions = activeTab === 'transactions' 
    ? [
        { value: 'ALL', label: 'Todos os tipos' },
        { value: 'INCOME', label: 'Receitas' },
        { value: 'EXPENSE', label: 'Despesas' }
      ]
    : [
        { value: 'ALL', label: 'Todos os tipos' },
        { value: 'DIVIDEND', label: 'Dividendos' },
        { value: 'BUY', label: 'Compras/Vendas' },
        { value: 'SELL', label: 'Vendas' },
      ];

  // Opções para o select de categoria
  const categoryOptions = [
    { value: 'ALL', label: 'Todas categorias' },
    ...categories.map(category => ({
      value: category.id,
      label: category.name
    }))
  ];

  // Opções para o select de ordenação
  const sortOptions = [
    { value: 'description-asc', label: 'Descrição (A-Z)' },
    { value: 'description-desc', label: 'Descrição (Z-A)' },
    { value: 'amount-desc', label: 'Valor (maior)' },
    { value: 'amount-asc', label: 'Valor (menor)' }
  ];

  return (
    <div className={`p-3 border-b ${colors.bg} ${colors.border}`}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              icon={<HiFilter className="w-4 h-4" />}
              variant="outlined"
              size="sm"
              className="w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border ${colors.inputBorder} rounded-lg ${colors.hover} transition-colors flex items-center justify-center`}
          >
            <HiFilter className={`w-4 h-4 ${colors.textSecondary}`} />
          </button>
        </div>

        {showFilters && (
          <div className={`grid grid-cols-2 gap-2 ${colors.inputBg} rounded-lg`}>
            <Select
              options={typeOptions}
              value={filterType}
              onChange={onFilterTypeChange as any}
              variant="outlined"
              size="sm"
              className="w-full"
            />

            {activeTab === 'transactions' && (
              <Select
                options={categoryOptions}
                value={filterCategory}
                onChange={onFilterCategoryChange as any}
                variant="outlined"
                size="sm"
                className="w-full"
                searchable={true}
                searchPlaceholder="Buscar categoria..."
              />
            )}

            <Select
              options={sortOptions}
              value={`${sortBy}-${sortOrder}`}
              onChange={(value) => {
                const [field, order] = value.toString().split('-');
                onSortChange(field as any, order as any);
              }}
              variant="outlined"
              size="sm"
              className="col-span-2"
            />
          </div>
        )}
      </div>
    </div>
  );
}
