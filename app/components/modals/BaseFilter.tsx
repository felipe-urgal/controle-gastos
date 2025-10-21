// app/components/filters/BaseFilter.tsx
'use client';

import { Select, Button } from '@/app/components';

import { FaTimes } from 'react-icons/fa';

interface BaseFilterProps<T = string> {
  // Filtros
  filterType: T | 'ALL' | null;
  filterActive: 'ALL' | 'ACTIVE' | 'INACTIVE' | null;
  
  // Opções
  typeOptions: Array<{ value: T | 'ALL'; label: string }>;
  activeOptions?: Array<{ value: string; label: string }>;
  
  // Callbacks
  onFilterTypeChange: (type: T | 'ALL' | null) => void;
  onFilterActiveChange: (active: 'ALL' | 'ACTIVE' | 'INACTIVE' | null) => void;
  onClearFilters?: () => void;
  
  // Configurações
  typePlaceholder?: string;
  activePlaceholder?: string;
  showClearButton?: boolean;
  hasActiveFilters?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function BaseFilter<T = string>({
  // Filtros
  filterType,
  filterActive,
  
  // Opções
  typeOptions,
  activeOptions = [
    { value: 'ALL', label: 'Todas' },
    { value: 'ACTIVE', label: 'Ativas' },
    { value: 'INACTIVE', label: 'Inativas' },
  ],
  
  // Callbacks
  onFilterTypeChange,
  onFilterActiveChange,
  onClearFilters,
  
  // Configurações
  typePlaceholder = 'Filtrar por tipo',
  activePlaceholder = 'Filtrar por status',
  showClearButton = true,
  hasActiveFilters = false,
  size = 'sm'
}: BaseFilterProps<T>) {
  const handleTypeChange = (value: string | number) => {
    // Converter para string antes de passar para o callback
    const stringValue = String(value);
    onFilterTypeChange(stringValue ? (stringValue as T | 'ALL') : null);
  };

  const handleActiveChange = (value: string | number) => {
    // Converter para string antes de passar para o callback
    const stringValue = String(value);
    onFilterActiveChange(stringValue ? stringValue as 'ALL' | 'ACTIVE' | 'INACTIVE' : null);
  };

  // Converter filterType para string para o Select
  const filterTypeString = filterType ? String(filterType) : '';
  const filterActiveString = filterActive ? String(filterActive) : '';

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Filtros */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          placeholder={typePlaceholder}
          value={filterTypeString}
          onChange={handleTypeChange}
          options={typeOptions.map(option => ({
            value: String(option.value),
            label: option.label
          }))}
          size={size}
        />

        <Select
          placeholder={activePlaceholder}
          value={filterActiveString}
          onChange={handleActiveChange}
          options={activeOptions}
          size={size}
        />
      </div>

      {/* Botão Limpar Filtros */}
      {showClearButton && hasActiveFilters && onClearFilters && (
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size={size}
            onClick={onClearFilters}
            icon={<FaTimes size={14} />}
            className="whitespace-nowrap"
          >
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}
