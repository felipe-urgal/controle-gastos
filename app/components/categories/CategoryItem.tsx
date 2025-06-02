// Hook
import { useRouter } from "next/navigation";

// Icons
import { HiOutlineTrash, HiOutlinePencil } from "react-icons/hi";

// Toast
import { toast } from "react-toastify";

// Types
import { CategoryModel } from "@/app/types/category";

interface CategoryItemProps {
  category: CategoryModel;
  onDelete: (id: string) => Promise<void>;
  isDeleting?: boolean;
};

export const CategoryItem = ({ category, onDelete, isDeleting = false }: CategoryItemProps) => {
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await onDelete(category.id);
    } catch (error) {
      toast.error("Erro ao excluir categoria");
      console.error("Erro ao excluir categoria:", error);
    }
  };

  const handleEditar = () => {
    router.push(`/categorias/${category.id}`);
  };

  return (
    <tr className="table-row hover:bg-gray-800/50 transition-colors border-b border-gray-700">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{category.name}</span>
        </div>
      </td>
      <td className="px-3">
        <div className="flex justify-end">
          <button
            onClick={handleEditar}
            className="cursor-pointer text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
            aria-label="Editar conta"
          >
            <HiOutlinePencil className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="cursor-pointer text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
            aria-label="Excluir conta"
          >
            {isDeleting ? (
              <span className="animate-spin inline-block h-4 w-4">...</span>
            ) : (
              <HiOutlineTrash className="h-4 w-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
};