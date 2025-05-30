import { Category } from "@/app/types/category";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { TbFilterOff } from 'react-icons/tb'

interface Account {
  id: string;
  name: string;
  // Add other account properties as needed
}

interface TransactionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    type: string;
    category: string;
    account: string;
    month: string;
    year: string;
  };
  onFilterChange: (name: "type" | "category" | "month" | "year" | "account", value: string) => void;
  categories: Category[];
  accounts: Account[];
  onClearFilters: () => void;
  // showFilters?: boolean;
  // onToggleFilters?: () => void;
  loading?: boolean;
}

export const TransactionFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  categories,
  accounts,
  // showFilters,
  // onToggleFilters,
  onClearFilters,
  loading
}: TransactionFiltersProps) => {

  const types = [
    { id: 'INCOME', name: 'Renda' },
    { id: 'EXPENSE', name: 'Despesa' },
    { id: 'INVESTMENT', name: 'Investimentos' }
  ];

  return (
    <div className="bg-gray-800 p-6 border-b border-gray-700">
      <div className="relative">
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

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Type filter */}
        <Select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          placeholder="Filtrar por tipo"
          options={types}
          disabled={loading}
          loading={loading}
          name="type"
        />

        {/* Category filter */}
        <Select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          placeholder="Filtrar por categoria"
          options={categories}
          disabled={loading}
          loading={loading}
          name="category"
        />

        {/* Account filter */}
        <Select
          value={filters.account}
          onChange={(e) => onFilterChange('account', e.target.value)}
          placeholder="Filtrar por conta"
          options={accounts}
          disabled={loading}
          loading={loading}
          name="account"
        />

        {/* Clear filters button */}
        <Button
          variant='secondary'
          title="Limpar filtros"
          icon={<TbFilterOff size={16} />}
          disabled={loading}
          onClick={onClearFilters}
        >
        </Button>
      </div>
    </div>
  );
};