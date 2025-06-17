// Hooks
import { useTransactionFormData } from "@/app/hook/useTransactionFormData";

// Components
import { FiltersContainer, Input, Select } from "@/app/components";

// Icons
import { FaSpinner, FaFilter, FaSearch, FaCreditCard } from "react-icons/fa";

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
}

const InvestmentFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  loading,
  message
}: InvestmentFiltersProps) => {

  const { accounts, isLoading } = useTransactionFormData({ accountType: "INVESTMENT" });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <FiltersContainer onClearFilters={onClearFilters} message={message}>
      <div className="sm:col-span-1">
        <Input
          name='searchTerm'
          type="text"
          placeholder="Buscar investimento..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading}
          loading={loading}
          icon={loading ? <FaSpinner /> : <FaSearch />}
        />
      </div>

      <div className="sm:col-span-1">
        <Select
          value={filters.type}
          onChange={(e) => onFilterChange('type', e.target.value)}
          placeholder="Filtrar por tipo"
          options={InvestmentType}
          disabled={loading}
          loading={loading}
          name="type"
          icon={loading ? <FaSpinner /> : <FaFilter />}
        />
      </div>

      <div className="sm:col-span-1">
        <Select
          value={filters.account}
          onChange={(e) => onFilterChange('account', e.target.value)}
          placeholder="Filtrar por conta"
          options={accounts}
          disabled={loading}
          loading={loading}
          name="account"
          icon={loading ? <FaSpinner /> : <FaCreditCard />}
        />
      </div>
    </FiltersContainer>
  );
};

export default InvestmentFilters;
