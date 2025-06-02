import { HiOutlineTrash } from "react-icons/hi";
import { CategoryModel } from "@/app/types/category";
import { toast } from "react-toastify";

type CategoryItemProps = {
  category: CategoryModel;
  onDelete: (id: string) => Promise<void>;
  isDeleting?: boolean;
};

export const CategoryItem = ({ category, onDelete, isDeleting = false }: CategoryItemProps) => {

  const handleDelete = async () => {
    try {
      await onDelete(category.id);
    } catch (error) {
      toast.error("Erro ao excluir categoria");
      console.error("Erro ao excluir categoria:", error);
    }
  };

  return (
    <>
      {/* Desktop Table Row */}
      <tr className="hidden md:table-row hover:bg-gray-800/50 transition-colors border-b border-gray-700">
        <td className="px-4 py-5 text-sm font-medium text-gray-400">
          {category.name}
        </td>
        <td className="">
          <div className="flex justify-end gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
              aria-label="Excluir transação"
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

      {/* Mobile List Item */}
      <tr className="md:hidden">
        <td colSpan={7} className="p-0 border-b border-gray-700">
          <div className="px-6 py-2 hover:bg-gray-800/50 transition-colors">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-gray-100 truncate">
                  {category.name}
                </p>
              </div>
              <div className="flex flex-row items-center">
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="cursor-pointer text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
                  >
                    {isDeleting ? (
                      <span className="animate-spin inline-block h-4 w-4">...</span>
                    ) : (
                      <HiOutlineTrash className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
};