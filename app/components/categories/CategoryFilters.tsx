// Components
import { FiltersContainer, Input } from "@/app/components";

// Icons
import { FaSpinner, FaSearch } from "react-icons/fa";

interface CategoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
  message?: string;
}

const CategoryFilters = ({ searchTerm, onSearchChange, onClearFilters, loading, message }: CategoryFiltersProps) => {
  return (
    <FiltersContainer onClearFilters={onClearFilters} message={message}>
      <div className="sm:col-span-4">
        <Input
          name='searchTerm'
          type="text"
          placeholder="Buscar categoria..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading}
          className="w-100"
          icon={loading ? <FaSpinner /> : <FaSearch />}
        />
      </div>
    </FiltersContainer>
  );
};

export default CategoryFilters;
