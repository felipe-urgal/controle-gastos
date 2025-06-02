// import { Category } from "@/app/types/category";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Input } from "../ui/Input";
import { TbFilterOff, TbFilter } from 'react-icons/tb'
import { useState } from "react";
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
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-gray-800 p-3 border-b border-gray-700">
      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {showFilters && (
            <>
              <Input
                name='searchTerm'
                type="text"
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                disabled={loading}
                loading={loading}
              />

              {/* Type filter */}
              <Select
                value={filters.type}
                onChange={(e) => onFilterChange('type', e.target.value)}
                placeholder="Filtrar por tipo"
                options={TransactionType}
                disabled={loading}
                loading={loading}
                name="type"
              />

              <Button
                variant='secondary'
                title="Limpar filtros"
                icon={<TbFilterOff size={16} />}
                disabled={loading}
                onClick={onClearFilters}
              >
              </Button>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            icon={<TbFilter size={16} />}
            className='border-0 hover:bg-gray-800'
          >
            {showFilters ? 'Esconder' : 'Mostrar'} Filtros
          </Button>
        </div>
      </div>
    </div>
  );
};