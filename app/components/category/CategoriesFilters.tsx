// app/components/AccountsFilter.tsx
import { CategoryType } from '@/app/types/category';
import { Select } from '@/app/components';

interface AccountsFilterProps {
  filterType: CategoryType | 'ALL' | null;
  filterActive: 'ALL' | 'ACTIVE' | 'INACTIVE' | null;
  onFilterTypeChange: (type: CategoryType | 'ALL' | null) => void;
  onFilterActiveChange: (active: 'ALL' | 'ACTIVE' | 'INACTIVE' | null) => void;
}

export default function AccountsFilter({
  filterType,
  filterActive,
  onFilterTypeChange,
  onFilterActiveChange,
}: AccountsFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 grid grid-cols-2 gap-3">
        <Select
          placeholder="Filtrar por tipo"
          value={filterType || ''} // String vazia quando for null
          onChange={(value) => onFilterTypeChange(value ? (value as CategoryType | 'ALL') : null)}
          options={[
            { value: 'ALL', label: 'Todos os tipos' },
            { value: 'EXPENSE', label: 'Despesas' },
            { value: 'INCOME', label: 'Receitas' }
          ]}
          size="sm"
        />

        <Select
          placeholder="Filtrar por status"
          value={filterActive  || ''}
          onChange={(value) => onFilterActiveChange(value ? (value as 'ALL' | 'ACTIVE' | 'INACTIVE') : null)}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'ACTIVE', label: 'Ativas' },
            { value: 'INACTIVE', label: 'Inativas' },
          ]}
          size="sm"
        />
      </div>
    </div>
  );
}