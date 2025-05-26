import { HiOutlineChevronUp, HiOutlineChevronDown } from "react-icons/hi";
import { Categoria } from "@/app/types/transacao";

interface TransactionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    tipo: string;
    categoria: string;
  };
  onFilterChange: (name: "tipo" | "categoria", value: string) => void;
  categories: Categoria[];
  showFilters: boolean;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

export const TransactionFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  categories,
  showFilters,
  onToggleFilters,
  onClearFilters
}: TransactionFiltersProps) => {
  return (
    <div className="">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
        {/* Filter controls */}
        {showFilters && (
          <>
            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type filter */}
              <select
                value={filters.tipo}
                onChange={(e) => onFilterChange('tipo', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Todos os tipos</option>
                <option value="renda">Renda</option>
                <option value="despesa">Despesa</option>
                <option value="investimentos">Investimentos</option>
              </select>

              {/* Category filter */}
              <select
                value={filters.categoria}
                onChange={(e) => onFilterChange('categoria', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nome}
                  </option>
                ))}
              </select>

              {/* Clear filters button */}
              <button
                onClick={onClearFilters}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          </>
        )}

        {/* Toggle filters button */}
        <button
          onClick={onToggleFilters}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {showFilters ? (
            <>
              <HiOutlineChevronUp className="h-4 w-4" />
              Ocultar filtros
            </>
          ) : (
            <>
              <HiOutlineChevronDown className="h-4 w-4" />
              Mostrar filtros
            </>
          )}
        </button>
      </div>
    </div>
  );
};