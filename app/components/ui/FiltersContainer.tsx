"use client"

// Hooks
import { useState, useRef, useEffect } from "react";

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
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(showFilters ? contentRef.current.scrollHeight : 0);
    }
  }, [showFilters]);

  const icon = showFilters ? <FaChevronUp className="transition-transform duration-300" /> : <FaChevronDown className="transition-transform duration-300" />;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm mb-5">
      <div className="flex flex-col">
        <div 
          ref={contentRef}
          className="overflow-hidden transition-all duration-500 ease-in-out"
          style={{ height: `${height}px` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
            {children}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end items-center gap-3">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          icon={icon}
          variant="outline"
        >
          {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
        </Button>
      
      </div>

      {message && (
        <div className="mt-4 bg-gradient-to-r from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200 flex justify-between items-center">
          <span className="text-indigo-700 text-sm font-medium">
            {message}
          </span>

          <Button
            onClick={() => {
              onClearFilters();
              setShowFilters(false);
            }}
            icon={<FaTimesCircle size={16} />}
            variant="link"
          >
            Limpar Filtros
          </Button>
        </div>
      )}
    </div>
  );
};

export default FiltersContainer;