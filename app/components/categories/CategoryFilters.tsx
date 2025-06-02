// Components
import { FiltersContainer } from "../ui/FiltersContainer";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

// Icons
import { TbFilterOff } from 'react-icons/tb';

interface CategoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  loading?: boolean;
}

export const CategoryFilters = ({ searchTerm, onSearchChange, onClearFilters, loading }: CategoryFiltersProps) => {
  return (
    <FiltersContainer>
      <Input
        name='searchTerm'
        type="text"
        placeholder="Buscar categoria..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={loading}
        className="w-100"
      />

      <Button
        variant='secondary'
        title="Limpar filtros"
        icon={<TbFilterOff size={16} />}
        disabled={loading}
        onClick={onClearFilters}
        className="mb-3"
      />
    </FiltersContainer>
  );
};