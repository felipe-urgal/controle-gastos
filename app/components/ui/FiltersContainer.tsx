// Hooks
import { useState } from "react";

// Components
import { Button } from "../ui/Button";

// Icons
import { TbFilterOff, TbFilter } from 'react-icons/tb';

interface FiltersContainerProps {
  children: React.ReactNode;
}

export const FiltersContainer = ({ children }: FiltersContainerProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const icon = showFilters ? <TbFilter size={16} /> : <TbFilterOff size={16} />

  return (
    <div className="bg-gray-800 p-3 border-b border-gray-700">
      <div className="flex flex-col sm:flex-row">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-2">
          {showFilters && (
            <>
              {children}
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          icon={icon}
          size='sm'
          variant='ghost'
        >
          {showFilters ? 'Esconder' : 'Mostrar'} Filtros
        </Button>
      </div>
    </div>
  );
};