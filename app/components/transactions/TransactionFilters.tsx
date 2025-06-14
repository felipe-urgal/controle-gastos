// Hooks
import { useTransactionFormData } from "@/app/hook/useTransactionFormData";

// Components
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { FiltersContainer } from "../ui/FiltersContainer";

// Icons
import { FaSpinner, FaClock, FaCalendar, FaFilter, FaSearch, FaTag, FaCreditCard } from "react-icons/fa";

// Utils
import { TransactionType } from "@/app/utils/format";

interface TransactionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    [key: string]: string;
  };
  onFilterChange: (name: "type" | "month" | "year" | "category" | "account", value: string) => void;
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

  const { categories, accounts, isLoading } = useTransactionFormData();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

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
          icon={loading ? <FaSpinner /> : <FaSearch />}
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
          icon={loading ? <FaSpinner /> : <FaFilter />}
        />
      </div>

      <div className="sm:col-span-1">
        <Select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          placeholder="Filtrar por categoria"
          options={categories}
          disabled={loading}
          loading={loading}
          name="category"
          icon={loading ? <FaSpinner /> : <FaTag />}
        />
      </div>

      <div className="sm:col-span-1">
        <Select
          value={filters.account}
          onChange={(e) => onFilterChange('account', e.target.value)}
          placeholder="Filtrar por conta"
          options={accounts}
          disabled={loading}
          loading={loading}
          name="account"
          icon={loading ? <FaSpinner /> : <FaCreditCard />}
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
          icon={loading ? <FaSpinner /> : <FaCalendar />}
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
          icon={loading ? <FaSpinner /> : <FaClock />}
          name="year"
        />
      </div>
    </FiltersContainer>
  );
};