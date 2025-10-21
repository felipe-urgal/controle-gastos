// app/components/accounts/AccountsFilter.tsx
'use client';

import { AccountType } from '@/app/types/account';

import { BaseFilter } from '@/app/components';

import { useFilterManager } from '@/app/hook';

interface AccountsFilterProps {
  filterType: AccountType | 'ALL' | null;
  filterActive: 'ALL' | 'ACTIVE' | 'INACTIVE' | null;
  onFilterTypeChange: (type: AccountType | 'ALL' | null) => void;
  onFilterActiveChange: (active: 'ALL' | 'ACTIVE' | 'INACTIVE' | null) => void;
}

export default function AccountsFilter({
  filterType,
  filterActive,
  onFilterTypeChange,
  onFilterActiveChange,
}: AccountsFilterProps) {
  const filterManager = useFilterManager<AccountType | 'ALL'>({
    initialType: filterType,
    initialActive: filterActive,
    onFilterChange: (filters) => {
      onFilterTypeChange(filters.type);
      onFilterActiveChange(filters.active);
    }
  });

  const typeOptions: Array<{ value: AccountType | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'Todos os tipos' },
    { value: 'CREDIT_DEBIT', label: 'Crédito/Débito' },
    { value: 'INVESTMENT', label: 'Investimento' }
  ];

  return (
    <BaseFilter<AccountType | 'ALL'>
      filterType={filterManager.filterType}
      filterActive={filterManager.filterActive}
      typeOptions={typeOptions}
      onFilterTypeChange={filterManager.setFilterType}
      onFilterActiveChange={filterManager.setFilterActive}
      onClearFilters={filterManager.clearFilters}
      hasActiveFilters={filterManager.hasActiveFilters}
      typePlaceholder="Filtrar por tipo de conta"
      activePlaceholder="Filtrar por status"
    />
  );
}
