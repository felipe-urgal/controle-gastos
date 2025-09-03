// Components
import { FiltersContainer, Input } from "@/app/components";

// Icons
import { FaSearch } from "react-icons/fa";

interface CategoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
  message?: string;
  onFileSelect: (file: File) => void;
}

const CategoryFilters = ({ searchTerm, onSearchChange, onClearFilters, loading, message, onFileSelect }: CategoryFiltersProps) => {

  const importConfig = {
    title: "Importar Categorias",
    exampleContent: "nome\nAlimentação\nSalário\nTransporte\nInvestimentos",
    downloadFileName: 'exemplo-categorias.csv',
    formatDescription: (
      <>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Formato do CSV para Categorias:</h4>
              
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-600 mb-1">Português:</h5>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>nome:</strong> Nome da categoria (obrigatório)</li>
          </ul>
        </div>

        <div className="pt-3 border-t border-gray-200">
          <h5 className="text-xs font-medium text-gray-600 mb-1">Inglês:</h5>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>name:</strong> Category name (required)</li>
          </ul>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Dica:</strong> O sistema detecta automaticamente o formato e idioma do arquivo.
          </p>
        </div>
      </>
    )
  };

  return (
    <FiltersContainer 
      onClearFilters={onClearFilters} 
      onFileSelect={onFileSelect}
      importConfig={importConfig}
      message={message} 
      loading={loading}
      showImportButton={true}
    >
      <div className="sm:col-span-4">
        <Input
          name='searchTerm'
          type="text"
          placeholder="Buscar categoria..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading}
          className="w-100"
          icon={<FaSearch />}
        />
      </div>
    </FiltersContainer>
  );
};

export default CategoryFilters;
