// hook
import { useTransactionFormData } from "@/app/hook/useTransactionFormData";

// components
import { FiltersContainer, Input, Select } from "@/app/components";

// icons
import { FaClock, FaCalendar, FaFilter, FaSearch, FaTag, FaCreditCard } from "react-icons/fa";

// utils
import { TransactionType } from "@/app/utils/format";

interface TransactionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    [key: string]: string;
  };
  onFilterChange: (name: "type" | "month" | "year" | "category" | "account", value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
  message?: string;
  onFileSelect: (file: File) => void;
  onCreate?: () => void;

}

const MONTHS = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => ({
  value: String(CURRENT_YEAR - i),
  label: String(CURRENT_YEAR - i),
}));

const TransactionFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  loading,
  message,
  onFileSelect,
  onCreate
}: TransactionFiltersProps) => {
  const { categories, accounts } = useTransactionFormData({ accountType: "CHECKING" });

  const importConfig = {
    title: "Importar Transações",
    exampleContent: "tipo;valor;conta;data;descricao;categoria\nRECEITA;1500,00;Conta Corrente;15/01/2024;Salário;Salário",
    downloadFileName: 'exemplo-transacoes.csv',
    formatDescription: (
      <>
        <h4 className="font-semibold text-gray-700 mb-2">Formatos aceitos:</h4>
        
        <div className="mb-2">
          <h5 className="font-medium text-gray-600 mb-1">Português (ponto e vírgula):</h5>
          <ul className="text-gray-600 space-y-1">
            <li>• <strong>tipo:</strong> RECEITA ou DESPESA</li>
            <li>• <strong>valor:</strong> 1500,00 (vírgula decimal)</li>
            <li>• <strong>conta:</strong> Nome da conta</li>
            <li>• <strong>data:</strong> DD/MM/YYYY ou YYYY-MM-DD</li>
            <li>• <strong>Separador:</strong> Ponto e vírgula (;)</li>
          </ul>
        </div>

        {/*<div className="pt-2 border-t border-gray-200">
          <h5 className="font-medium text-gray-600 mb-1">Inglês (vírgula):</h5>
          <ul className="text-gray-600 space-y-1">
            <li>• <strong>type:</strong> INCOME ou EXPENSE</li>
            <li>• <strong>amount:</strong> 1500.00 (ponto decimal)</li>
            <li>• <strong>account:</strong> Account name</li>
            <li>• <strong>transactionDate:</strong> YYYY-MM-DD</li>
            <li>• <strong>Separador:</strong> Vírgula (,)</li>
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
      onCreate={onCreate}
      showCreateButton={true}
    >
      <Input
        name='searchTerm'
        type="text"
        placeholder="Buscar transações..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={loading}
        loading={loading}
        icon={<FaSearch />}
      />

      <Select
        value={filters.type}
        onChange={(e) => onFilterChange('type', e.target.value)}
        placeholder="Filtrar por tipo"
        options={TransactionType}
        disabled={loading}
        loading={loading}
        name="type"
        icon={<FaFilter />}
      />

      <Select
        value={filters.category}
        onChange={(e) => onFilterChange('category', e.target.value)}
        placeholder="Filtrar por categoria"
        options={categories}
        disabled={loading}
        loading={loading}
        name="category"
        icon={<FaTag />}
      />

      <Select
        value={filters.account}
        onChange={(e) => onFilterChange('account', e.target.value)}
        placeholder="Filtrar por conta"
        options={accounts}
        disabled={loading}
        loading={loading}
        name="account"
        icon={<FaCreditCard />}
      />

      <Select
        value={filters.month}
        onChange={(e) => onFilterChange('month', e.target.value)}
        placeholder="Mês"
        options={MONTHS}
        disabled={loading}
        loading={loading}
        icon={<FaCalendar />}
        name="month"
      />

      <Select
        value={filters.year}
        onChange={(e) => onFilterChange('year', e.target.value)}
        placeholder="Ano"
        options={YEARS}
        disabled={loading}
        loading={loading}
        icon={<FaClock />}
        name="year"
      />
    </FiltersContainer>
  );
};

export default TransactionFilters;