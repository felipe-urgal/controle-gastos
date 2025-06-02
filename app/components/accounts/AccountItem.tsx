// Hook
import { useRouter } from "next/navigation";

// Icons
import { HiOutlineTrash, HiOutlinePencil } from "react-icons/hi";

// Toast
import { toast } from "react-toastify";

// Utils
import { formatCurrency, AccountType } from "@/app/utils/format";

// Types
import { AccountModel } from "@/app/types/account";

interface AccountItemProps {
  account: AccountModel;
  onDelete: (id: string) => Promise<void>;
  isDeleting?: boolean;
};

export const AccountItem = ({ account, onDelete, isDeleting = false }: AccountItemProps) => {
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await onDelete(account.id);
    } catch (error) {
      toast.error("Erro ao excluir conta");
      console.error("Erro ao excluir conta:", error);
    }
  };

  const handleEditar = () => {
    router.push(`/contas/${account.id}`);
  };

  const amountColor = Number(account.balance) < 0
    ? "text-red-400"
    : Number(account.balance) === 0
      ? "text-gray-400"
      : "text-green-400"

  const typeText = AccountType.find(type => type.id === account.type)?.name || 'Unknown';

  return (
    <>
      {/* Desktop Table Row */}
      <tr className="hidden md:table-row hover:bg-gray-800/50 transition-colors border-b border-gray-700">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{typeText}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-400">
          {account.name}
        </td>
        <td className={`px-4 py-3 text-right font-semibold ${amountColor}`}>
          {formatCurrency(account.balance)}
        </td>
        <td className="py-3">
          <div className="flex justify-end">
            <button
              onClick={handleEditar}
              className="cursor-pointer text-blue-500 hover:text-blue-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
              aria-label="Editar conta"
            >
              <HiOutlinePencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
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

      {/* Mobile List Item */}
      <tr className="md:hidden">
        <td colSpan={7} className="p-0 border-b border-gray-700">
          <div className="px-6 py-2 hover:bg-gray-800/50 transition-colors">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-gray-100 truncate">
                  {account.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <p className={`font-semibold ${amountColor}`}>
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              </div>
              <div className="flex flex-row items-center">
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleEditar}
                    className="cursor-pointer text-blue-500 hover:text-blue-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
                  >
                    <HiOutlinePencil className="h-4 w-4" />
                  </button>
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