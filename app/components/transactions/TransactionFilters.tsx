// Components
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { FiltersContainer } from "../ui/FiltersContainer";

// Icons
import { TbFilterOff } from 'react-icons/tb'

// Utils
import { TransactionType } from "@/app/utils/format";

interface TransactionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    type: string;
  };
  onFilterChange: (name: "type", value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export const TransactionFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  loading
}: TransactionFiltersProps) => {
  return (
    <FiltersContainer>
      <div className="sm:col-span-4">
        <Input
          name='searchTerm'
          type="text"
          placeholder="Buscar transações..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading}
          loading={loading}
        />
      </div>

      <div className="sm:col-span-1">
        <Select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          placeholder="Filtrar por tipo"
          options={TransactionType}
          disabled={loading}
          loading={loading}
          name="type"
        />
      </div>

      <Button
        variant='secondary'
        icon={<TbFilterOff size={16} />}
        disabled={loading}
        onClick={onClearFilters}
        className='w-40'
      >
        Limpar filtros
      </Button>
    </FiltersContainer>
  );
};