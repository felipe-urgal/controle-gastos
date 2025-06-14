// Hooks
import { useState } from "react";

// Components
import { Button } from "../ui/Button";

// Icons
import { FaChevronDown, FaChevronUp, FaTimesCircle } from "react-icons/fa";

interface FiltersContainerProps {
  children: React.ReactNode;
  onClearFilters: () => void;
  message?: string;
}

export const FiltersContainer = ({ children, onClearFilters, message }: FiltersContainerProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const icon = showFilters ? <FaChevronUp size={18}/> : <FaChevronDown size={18}/>

  return (
    <div className="bg-gray-800 p-3 border-b border-gray-700">
      <div className="flex justify-end mb-2">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          icon={icon}
          size='sm'
          className="border border-gray-500 text-gray-500 hover:border-orange-500 hover:text-orange-500 cursor-pointer"
        >
          {showFilters ? 'Esconder' : 'Mostrar'} Filtros
        </Button>
      </div>

      <div className="flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-2">
          {showFilters && (
            <>
              {children}
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="flex flex justify-between items-center justify-between bg-yellow-700/30 p-3 rounded-lg my-3">
          <span className="text-orange-500/70">
            {message}
          </span>
          <Button
            onClick={onClearFilters}
            icon={<FaTimesCircle size={16} />}
            size="sm"
            className="transition-colors text-orange-500/70 hover:underline cursor-pointer"
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
};