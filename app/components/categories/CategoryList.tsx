"use client"

// Hooks
import { useRouter } from "next/navigation";

// components
import { GenericList } from "@/app/components";

// types
import { CategoryModel } from '@/app/types/category'

// Icons
import { FaTrash, FaPencilAlt } from "react-icons/fa";

type CategoryListProps = {
  categories: CategoryModel[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

const CategoryList = ({ categories, onDelete, isDeleting = false }: CategoryListProps) => {
  const router = useRouter();

  const columns = [
    {
      key: 'name',
      header: 'Nome da Categoria',
      content: (category: CategoryModel) => category.name,
    },
  ];

  const renderItemActions = (category: CategoryModel) => (
    <div className="flex items-center space-x-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/categorias/${category.id}`);
        }}
        className="cursor-pointer p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
        aria-label="Editar categoria"
        title="Editar categoria"
      >
        <FaPencilAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(category.id);
        }}
        disabled={isDeleting}
        className="cursor-pointer p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        aria-label="Excluir categoria"
        title="Excluir categoria"
      >
        {isDeleting ? (
          <div className="animate-spin inline-block h-3.5 w-3.5 border-2 border-t-transparent border-current rounded-full"></div>
        ) : (
          <FaTrash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        )}
      </button>
    </div>
  );

  return (
    <GenericList
      items={categories}
      columns={columns}
      expandable={false}
      renderItemActions={renderItemActions}
    />
  );
};

export default CategoryList;