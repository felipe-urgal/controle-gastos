import { Button } from "../ui/Button";
import { TbFilterOff } from 'react-icons/tb'
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";

interface AccountFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    type: string;
  };
  onFilterChange: (name: "type", value: string) => void;
  onClearFilters: () => void;
  // showFilters?: boolean;
  // onToggleFilters?: () => void;
  loading?: boolean;
}

export const AccountFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  // showFilters,
  // onToggleFilters,
  onClearFilters,
  loading
}: AccountFiltersProps) => {
  const types = [
    { id: "CHECKING", name: "Conta Corrente" },
    { id: "SAVINGS", name: "Conta Poupança" },
    { id: "INVESTMENT", name: "Investimento" },
    { id: "CASH", name: "Dinheiro Físico" },
    { id: "OTHER", name: "Outro" },
  ];

  return (
    <div className="bg-gray-800 p-6 border-b border-gray-700 mb-6">
      <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Input
          name='searchTerm'
          type="text"
          placeholder="Buscar transações..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading}
        />

        {/* Type filter */}
        <Select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          placeholder="Filtrar por tipo"
          options={types}
          disabled={loading}
          name="type"
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