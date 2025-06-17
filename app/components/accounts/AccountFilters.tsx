// Components
import { FiltersContainer, Select, Input } from "@/app/components";

// Icons
import { FaSpinner, FaSearch, FaFilter } from "react-icons/fa";

// Utils
import { AccountType } from '@/app/utils/format';

interface AccountFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    [key: string]: string;
  };
  onFilterChange: (name: "type", value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
  message?: string;
}

const AccountFilters = ({ searchTerm, onSearchChange, filters, onFilterChange, onClearFilters, loading, message }: AccountFiltersProps) => {
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
          icon={loading ? <FaSpinner /> : <FaSearch />}
        />
      </div>

      <div className="sm:col-span-1">
        <Select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          placeholder="Filtrar por tipo"
          options={AccountType}
          disabled={loading}
          icon={loading ? <FaSpinner /> : <FaFilter />}
          name="type"
        />
      </div>
    </FiltersContainer>
  );
};

export default AccountFilters
