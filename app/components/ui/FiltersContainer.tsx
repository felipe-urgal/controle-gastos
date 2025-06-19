"use client"

// Hooks
import { useState } from "react";

// Components
import { Button } from "@/app/components";

// Icons
import { FaChevronDown, FaChevronUp, FaTimesCircle } from "react-icons/fa";

interface FiltersContainerProps {
  children: React.ReactNode;
  onClearFilters: () => void;
  message?: string;
}

const FiltersContainer = ({ children, onClearFilters, message }: FiltersContainerProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const icon = showFilters ? <FaChevronUp/> : <FaChevronDown/>

  return (
    <div className="bg-gray-800 p-3 border-b border-gray-700">
      <div className="flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-2">
          {showFilters && (
            <>
              {children}
            </>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          icon={icon}
          variant='secondary'
        >
          Filtros
        </Button>
      </div>

      {message && (
        <div className="mt-3 flex flex justify-between items-center justify-between bg-yellow-700/30 p-3 rounded-lg my-3">
          <span className="text-orange-500/70">
            {message}
          </span>
          <Button
            onClick={() => {
              onClearFilters();
              setShowFilters(false);
            }}
            icon={<FaTimesCircle size={16} />}
            className="transition-colors text-orange-500/70 hover:underline cursor-pointer"
          >
            Limpar filtros
          </Button>
        </div>
      )}

    </div>
  );
};

export default FiltersContainer;
