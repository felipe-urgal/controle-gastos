import { FilterField } from '@/app/components/navigation/dynamic-filters';
import { CategoryType } from '@/app/types/category';

export const typeConfig = {
  INCOME: {
    label: 'Receita',
    color: 'text-[var(--income)]',
    bgColor: 'bg-[var(--primary-subtle)]',
    borderColor: 'border-[var(--primary)]/35',
  },
  EXPENSE: {
    label: 'Despesa',
    color: 'text-[var(--expense)]',
    bgColor: 'bg-[var(--danger-subtle)]',
    borderColor: 'border-[var(--danger)]/35',
  },
};

export const categoryTypeOptions = [
  { value: 'EXPENSE', label: 'Despesa' },
  { value: 'INCOME', label: 'Receita' },
];

export const initialFormData = {
  name: '',
  type: 'EXPENSE' as CategoryType,
  color: '#3B82F6',
  icon: 'tag',
  description: '',
  isActive: true,
};

export const categoryFilters = [
  {
    type: 'search',
    key: 'search',
    placeholder: 'Buscar categoria...',
  },
  {
    type: 'select',
    key: 'isActive',
    label: 'Status',
    options: [
      { label: 'Ativa', value: 'true' },
      { label: 'Inativa', value: 'false' },
    ],
  },
  {
    type: 'select',
    key: 'type',
    label: 'Tipo',
    options: categoryTypeOptions,
  },
] satisfies FilterField[];
