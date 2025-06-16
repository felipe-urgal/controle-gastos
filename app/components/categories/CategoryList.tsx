// Hooks
import { useRouter } from "next/navigation";

// components
import { GenericList } from "@/app/components/ui/GenericList";

// types
import { CategoryModel } from '@/app/types/category'

// Icons
import { FaTrash, FaPencilAlt } from "react-icons/fa";

type CategoryListProps = {
  categories: CategoryModel[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

export const CategoryList = ({ categories, onDelete, isDeleting = false }: CategoryListProps) => {
  const router = useRouter();
  
  const columns = [
    {
      key: 'name',
      header: 'Nome da Categoria',
      content: (category: CategoryModel) => (
        <span className="text-sm font-medium text-gray-400">{category.name}</span>
      ),
    },
  ];

  const renderItemActions = (category: CategoryModel) => (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/categorias/${category.id}`);
        }}
        className="cursor-pointer text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
        aria-label="Editar categoria"
      >
        <FaPencilAlt className="h-4 w-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(category.id);
        }}
        disabled={isDeleting}
        className="cursor-pointer text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
        aria-label="Excluir categoria"
      >
        {isDeleting ? (
          <span className="animate-spin inline-block h-4 w-4">...</span>
        ) : (
          <FaTrash className="h-4 w-4" />
        )}
      </button>
    </>
  );

  return (
    <GenericList
      items={categories}
      columns={columns}
      renderItemActions={renderItemActions}
      emptyMessage="Nenhuma categoria encontrada"
      expandable={false}
    />
  );
};