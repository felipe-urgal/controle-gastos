// Components
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { FiltersContainer } from "../ui/FiltersContainer";

// Icons
import { FaSpinner } from "react-icons/fa";
import { FiSearch } from 'react-icons/fi';
import { FiFilter } from "react-icons/fi";
import { FiCalendar } from "react-icons/fi";
import { FiClock } from "react-icons/fi";

// Utils
import { TransactionType } from "@/app/utils/format";

interface TransactionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    type: string;
    month: string;
    year: string;
  };
  onFilterChange: (name: "type" | "month" | "year", value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
  message?: string;
}

const MONTHS = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => ({
  value: String(CURRENT_YEAR - i),
  label: String(CURRENT_YEAR - i),
}));

export const TransactionFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  loading,
  message
}: TransactionFiltersProps) => {
  return (
    <FiltersContainer onClearFilters={onClearFilters} message={message}>
      <div className="sm:col-span-1">
        <Input
          name='searchTerm'
          type="text"
          placeholder="Buscar transações..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading}
          loading={loading}
          icon={loading ? <FaSpinner /> : <FiSearch />}
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
          icon={loading ? <FaSpinner /> : <FiFilter />}
        />
      </div>

      <div className="sm:col-span-1">
        <Select
          value={filters.month}
          onChange={(e) => onFilterChange('month', e.target.value)}
          placeholder="Mês"
          options={MONTHS}
          disabled={loading}
          loading={loading}
          icon={loading ? <FaSpinner /> : <FiCalendar />}
          name="month"
        />
      </div>

      <div className="sm:col-span-1">
        <Select
          value={filters.year}
          onChange={(e) => onFilterChange('year', e.target.value)}
          placeholder="Ano"
          options={YEARS}
          disabled={loading}
          loading={loading}
          icon={loading ? <FaSpinner /> : <FiClock />}
          name="year"
        />
      </div>
    </FiltersContainer>
  );
};