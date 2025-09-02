"use client"

// Hooks
import { useState, useRef, useEffect } from "react";

// Components
import { Button } from "@/app/components";

// Icons
import { FaTimesCircle, FaFilter } from "react-icons/fa";

interface FiltersContainerProps {
  children: React.ReactNode;
  onClearFilters: () => void;
  message?: string;
}

const FiltersContainer = ({ children, onClearFilters, message }: FiltersContainerProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const height = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calcula a altura do conteúdo para animação
  useEffect(() => {
    if (contentRef.current && !isMobile) {
      height.current = contentRef.current.scrollHeight;
    }
  }, [showFilters, isMobile]);

  const toggleFilters = () => {
    if (isMobile) {
      setShowModal(true);
    } else {
      setShowFilters(!showFilters);
    }
  };

  const handleClearAll = () => {
    onClearFilters();
    setShowFilters(false);
    setShowModal(false);
  };

  return (
    <>
      <div className={`${!isMobile ? 'bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm mb-5' : ''}`}>
        {!isMobile && (
          <div className="flex flex-col">
          {/* Conteúdo dos filtros (visível apenas em desktop quando expandido) */}
            <div 
              ref={contentRef}
              className="overflow-hidden transition-all duration-500 ease-in-out"
              style={{ height: showFilters ? height.current : 0 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
                {children}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end items-center gap-3">
          <Button
            onClick={toggleFilters}
            icon={<FaFilter />}
            variant="secondary"
          >
            Filtros
          </Button>
        </div>

        {message && (
          <div className="mt-4 bg-gradient-to-r from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200 flex justify-between items-center">
            <span className="text-indigo-700 text-sm font-medium">
              {message}
            </span>

            <Button
              onClick={handleClearAll}
              icon={<FaTimesCircle size={16} />}
              variant="link"
              className="text-indigo-600 hover:text-indigo-800"
            >
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>

      {/* Modal para mobile */}
      {isMobile && showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-6">
                {children}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  className="flex-1"
                >
                  Limpar Tudo
                </Button>
                <Button
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FiltersContainer;