// Hooks
import { useTransactionFormData } from "@/app/hook/useTransactionFormData";

// Components
import { FiltersContainer, Input, Select } from "@/app/components";

// Icons
import { FaFilter, FaSearch, FaChartLine } from "react-icons/fa";

// Utils
import { InvestmentType } from "@/app/utils/format";

interface InvestmentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    [key: string]: string;
  };
  onFilterChange: (name: "type" | "account", value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
  message?: string;
  onFileSelect: (file: File) => void;
}

const InvestmentFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  loading,
  message,
  onFileSelect
}: InvestmentFiltersProps) => {
  const { accounts } = useTransactionFormData({ accountType: "INVESTMENT" });

  const importConfig = {
    title: "Importar Investimentos",
    exampleContent: "tipo;valor;conta;data;ticker;quantidade;preco_unitario;descricao\nCOMPRA;1500,00;Corretora;15/01/2024;PETR4;100;15,00;Compra de ações Petrobrás\nDIVIDENDO;50,00;Corretora;20/01/2024;PETR4;10;2;Dividendos recebidos\nVENDA;800,00;Corretora;25/01/2024;VALE3;50;16,00;Venda parcial de ações",
    downloadFileName: 'exemplo-investimentos.csv',
    formatDescription: (
      <>
        <h4 className="font-semibold text-gray-700 mb-2">Formato do CSV para Investimentos:</h4>
              
        <div className="mb-2">
          <h5 className="font-medium text-gray-600 mb-1">Português:</h5>
          <ul className="text-gray-600 space-y-1">
            <li>• <strong>tipo:</strong> COMPRA, VENDA ou DIVIDENDO</li>
            <li>• <strong>valor:</strong> Valor da operação (ex: 1500,00)</li>
            <li>• <strong>conta:</strong> Nome da conta de investimento</li>
            <li>• <strong>data:</strong> DD/MM/YYYY ou YYYY-MM-DD</li>
            <li>• <strong>ticker:</strong> Código do ativo (ex: PETR4)</li>
            <li>• <strong>quantidade:</strong> Número de cotas/ações</li>
            <li>• <strong>preco_unitario:</strong> Preço por unidade</li>
          </ul>
        </div>

        {/*<div className="pt-3 border-t border-gray-200">
          <h5 className="text-xs font-medium text-gray-600 mb-1">Inglês:</h5>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>type:</strong> BUY, SELL ou DIVIDEND</li>
            <li>• <strong>amount:</strong> Operation value (ex: 1500.00)</li>
            <li>• <strong>account:</strong> Investment account name</li>
            <li>• <strong>investmentDate:</strong> YYYY-MM-DD</li>
            <li>• <strong>ticker:</strong> Asset code (ex: PETR4)</li>
            <li>• <strong>quantity:</strong> Number of shares</li>
            <li>• <strong>unitPrice:</strong> Price per unit</li>
          </ul>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Dica:</strong> O sistema detecta automaticamente o formato, idioma e delimitador do arquivo.
          </p>
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
        placeholder="Buscar investimentos..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={loading}
        icon={<FaSearch />}
      />

      <Select
        value={filters.type}
        onChange={(e) => onFilterChange('type', e.target.value)}
        placeholder="Filtrar por tipo"
        options={InvestmentType}
        disabled={loading}
        icon={<FaFilter />}
        name="type"
      />

      <Select
        value={filters.account}
        onChange={(e) => onFilterChange('account', e.target.value)}
        placeholder="Filtrar por conta"
        options={accounts}
        disabled={loading}
        icon={<FaChartLine />}
        name="account"
      />
    </FiltersContainer>
  );
};

export default InvestmentFilters;
