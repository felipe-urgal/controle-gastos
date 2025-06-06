// Components
import { FiltersContainer } from "../ui/FiltersContainer";
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";

// Icons
import { FaSpinner } from "react-icons/fa";
import { FiSearch } from 'react-icons/fi';
import { FiFilter } from 'react-icons/fi';

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
  message?: string;
}

export const AccountFilters = ({ searchTerm, onSearchChange, filters, onFilterChange, onClearFilters, loading, message }: AccountFiltersProps) => {
  return (
    <FiltersContainer onClearFilters={onClearFilters} message={message}>
      <div className="sm:col-span-3">
        <Input
          name='searchTerm'
          type="text"
          placeholder="Buscar transações..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading}
          icon={loading ? <FaSpinner /> : <FiSearch />}
        />
      </div>

      <div className="sm:col-span-1">
        <Select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          placeholder="Filtrar por tipo"
          options={AccountType}
          disabled={loading}
          icon={loading ? <FaSpinner /> : <FiFilter />}
          name="type"
        />
      </div>
    </FiltersContainer>
  );
};