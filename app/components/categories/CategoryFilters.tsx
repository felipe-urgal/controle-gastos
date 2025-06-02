import { Button } from "../ui/Button";
import { TbFilterOff, TbFilter } from 'react-icons/tb';
import { Input } from "../ui/Input";
import { useState } from "react";

interface CategoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export const CategoryFilters = ({ searchTerm, onSearchChange, onClearFilters, loading }: CategoryFiltersProps) => {
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
              />

              <Button
                variant='secondary'
                title="Limpar filtros"
                icon={<TbFilterOff size={16} />}
                disabled={loading}
                onClick={onClearFilters}
              />
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