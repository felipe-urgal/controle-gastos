import { AccountType } from '@/app/types/account';
import { Select } from '@/app/components';

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
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 grid grid-cols-2 gap-3">
        <Select
          placeholder="Filtrar por tipo"
          value={filterType || ''}
          onChange={(value) => onFilterTypeChange(value ? (value as AccountType | 'ALL') : null)}
          options={[
            { value: 'ALL', label: 'Todos os tipos' },
            { value: 'CREDIT_DEBIT', label: 'Crédito/Débito' },
            { value: 'INVESTMENT', label: 'Investimento' }
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