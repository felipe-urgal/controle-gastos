// Components
import { FiltersContainer } from "../ui/FiltersContainer";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";

// Icons
import { TbFilterOff } from 'react-icons/tb';

// Utils
import { AccountType } from '@/app/utils/format';

interface AccountFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    type: string;
  };
  onFilterChange: (name: "type", value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export const AccountFilters = ({ searchTerm, onSearchChange, filters, onFilterChange, onClearFilters, loading }: AccountFiltersProps) => {
  return (
    <FiltersContainer>
      <Input
        name='searchTerm'
        type="text"
        placeholder="Buscar transações..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={loading}
      />

      <Select
        value={filters.type}
        onChange={(e) => onFilterChange('type', e.target.value)}
        placeholder="Filtrar por tipo"
        options={AccountType}
        disabled={loading}
        name="type"
      />

      <Button
        variant='secondary'
        title="Limpar filtros"
        icon={<TbFilterOff size={16} />}
        disabled={loading}
        onClick={onClearFilters}
        className="mb-3"
      />
    </FiltersContainer>
  );
};