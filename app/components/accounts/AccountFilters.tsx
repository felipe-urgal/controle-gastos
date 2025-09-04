// Components
import { FiltersContainer, Select, Input } from "@/app/components";

// Icons
import { FaSearch, FaFilter } from "react-icons/fa";

// Utils
import { AccountType } from '@/app/utils/format';

interface AccountFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    [key: string]: string;
  };
  onFilterChange: (name: "type", value: string) => void;
  onClearFilters: () => void;
  onFileSelect: (file: File) => void;
  loading?: boolean;
  message?: string;
}

const AccountFilters = ({ 
  searchTerm, 
  onSearchChange, 
  filters, 
  onFilterChange, 
  onClearFilters, 
  onFileSelect, 
  loading = false,
  message 
}: AccountFiltersProps) => {
  const importConfig = {
    title: "Importar Contas",
    exampleContent: "nome;tipo;saldo;moeda\nConta Corrente;CORRENTE;1500,00;BRL\nCartão de Crédito;CREDITO;-500,00;BRL\nPoupança;POUPANCA;5000,00;BRL",
    downloadFileName: 'exemplo-contas.csv',
    formatDescription: (
      <>
        <h4 className="font-semibold text-gray-700 mb-2">Formato do CSV para Contas:</h4>
              
        <div className="mb-2">
          <h5 className="font-medium text-gray-600 mb-1">Português:</h5>
          <ul className="text-gray-600 space-y-1">
            <li>• <strong>nome:</strong> Nome da conta (obrigatório)</li>
            <li>• <strong>tipo:</strong> CORRENTE, POUPANCA, INVESTIMENTO, CREDITO, OUTRO</li>
            <li>• <strong>saldo:</strong> Valor numérico (ex: 1500,00 ou 1500.00)</li>
            <li>• <strong>moeda:</strong> BRL, USD, EUR (opcional, padrão: BRL)</li>
            <li>• <strong>Separador:</strong> Ponto e vírgula (;) ou vírgula (,)</li>
          </ul>
        </div>

        {/*<div className="pt-2 border-t border-gray-200">
          <h5 className="font-medium text-gray-600 mb-1">Inglês:</h5>
          <ul className="text-gray-600 space-y-1">
            <li>• <strong>name:</strong> Account name (required)</li>
            <li>• <strong>type:</strong> CHECKING, SAVINGS, INVESTMENT, CREDIT, OTHER</li>
            <li>• <strong>balance:</strong> Numeric value (ex: 1500.00)</li>
            <li>• <strong>currency:</strong> BRL, USD, EUR (optional, default: BRL)</li>
            <li>• <strong>Separator:</strong> Semicolon (;) or comma (,)</li>
          </ul>
        </div>*/}
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
      <Input
        name='searchTerm'
        type="text"
        placeholder="Buscar contas..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={loading}
        icon={<FaSearch />}
      />

      <Select
        value={filters.type}
        onChange={(e) => onFilterChange('type', e.target.value)}
        placeholder="Filtrar por tipo"
        options={AccountType}
        disabled={loading}
        icon={<FaFilter />}
        name="type"
      />
    </FiltersContainer>
  );
};

export default AccountFilters;