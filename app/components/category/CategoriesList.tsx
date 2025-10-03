// app/components/categories/CategoriesList.tsx
"use client";

// import { useState } from 'react';
import { FaTags, FaPlus } from 'react-icons/fa';
import { CategoryModel } from '@/app/types/category';
import { Button, CategoryPreview } from '@/app/components';
import { categoryService } from '@/app/services/categoryService';
import { useTheme } from '@/app/context/ThemeContext';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  // const [deletingId, setDeletingId] = useState<string | null>(null);

  const colors = {
    text: {
      tertiary: isDark ? 'text-gray-400' : 'text-gray-500',
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    // setDeletingId(id);
    try {
      const result = await categoryService.deleteCategory(id);
      if (result.success) {
        onDelete(categories.filter(category => category.id !== id));
        onSuccess('Categoria excluída com sucesso!');
      } else {
        onError(result.message || 'Erro ao excluir categoria');
      }
    } catch (err: any) {
      onError(err?.message || 'Erro ao excluir categoria');
      console.error('Erro ao excluir categoria:', err);
    } finally {
      // setDeletingId(null);
    }
  };

  const handleToggleActive = async (category: CategoryModel) => {
    try {
      const updatedCategory = await categoryService.updateCategory({
        ...category,
        isActive: !category.isActive
      });
      onToggleActive(categories.map(cat => 
        cat.id === category.id ? updatedCategory : cat
      ));
      onSuccess(`Categoria ${!category.isActive ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (err: any) {
      onError('Erro ao alterar status da categoria');
      console.error('Erro ao alterar categoria:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className={`mt-2 ${colors.text.tertiary}`}>Carregando categorias...</p>
      </div>
    );
  }

  if (filteredCategories.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <FaTags className="text-gray-400 text-4xl mb-4" />
        <p className={`text-center ${colors.text.tertiary} mb-4`}>
          {categories.length === 0 
            ? 'Nenhuma categoria cadastrada' 
            : 'Nenhuma categoria encontrada com os filtros atuais'
          }
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          icon={<FaPlus size={14} />}
          className="border border-dashed hover:border-solid"
        >
          Adicionar Primeira Categoria
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCategories.map((category) => (
          <CategoryPreview
            key={category.id}
            category={category}
            onEdit={onEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            // isDeleting={deletingId === category.id}
          />
        ))}
      </div>
    </div>
  );
}