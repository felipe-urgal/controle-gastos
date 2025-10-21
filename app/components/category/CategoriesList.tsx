// app/components/categories/CategoriesList.tsx
'use client';

import { FaTags } from 'react-icons/fa';

import { categoryService } from '@/app/services';

import { CategoryModel } from '@/app/types/category';

import { CategoryCard, BaseList } from '@/app/components';

import { useListManager } from '@/app/hook';

interface CategoriesListProps {
  categories: CategoryModel[];
  filteredCategories: CategoryModel[];
  loading: boolean;
  onEdit: (category: CategoryModel) => void;
  onDelete: (categories: CategoryModel[]) => void;
  onToggleActive: (categories: CategoryModel[]) => void;
  onError: (error: string) => void;
  onSuccess: (success: string) => void;
  onAdd: () => void;
}

export default function CategoriesList({
  categories,
  filteredCategories,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
  onError,
  onSuccess,
  onAdd
}: CategoriesListProps) {
  const listManager = useListManager({
    onDelete,
    onToggleActive,
    onError,
    onSuccess
  });

  const handleDelete = (id: string) => {
    listManager.handleDelete(id, categories, categoryService.deleteCategory, 'categoria');
  };

  const handleToggleActive = (category: CategoryModel) => {
    listManager.handleToggleActive(category, categories, categoryService.updateCategory, 'categoria');
  };

  const renderCategory = (category: CategoryModel) => (
    <CategoryCard
      key={category.id}
      category={category}
      onEdit={onEdit}
      onDelete={() => handleDelete(category.id)}
      onToggleActive={() => handleToggleActive(category)}
      isDeleting={listManager.deletingId === category.id}
      isToggling={listManager.togglingId === category.id}
    />
  );

  const emptyIcon = <FaTags className="text-gray-400 text-4xl mb-4" />;

  return (
    <BaseList
      filteredItems={filteredCategories}
      loading={loading}
      emptyIcon={emptyIcon}
      emptyTitle={categories.length === 0 ? 'Nenhuma categoria cadastrada' : 'Nenhuma categoria encontrada'}
      emptyDescription={categories.length === 0 
        ? 'Comece criando sua primeira categoria para organizar suas transações.' 
        : 'Tente ajustar os filtros para encontrar o que procura.'
      }
      addButtonText="Adicionar Primeira Categoria"
      onAdd={onAdd}
      renderItem={renderCategory}
      itemName="categoria"
    />
  );
}
