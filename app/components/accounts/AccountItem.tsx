// Hook
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

export const AccountItem = ({ account, onDelete, isDeleting = false }: AccountItemProps) => {
  const router = useRouter();

  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede a propagação para o toggleExpand
    try {
      await onDelete(account.id);
    } catch (error) {
      toast.error("Erro ao excluir conta");
      console.error("Erro ao excluir conta:", error);
    }
  };

  const handleEditar = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede a propagação para o toggleExpand
    router.push(`/contas/${account.id}`);
  };

  const amountColor = Number(account.balance) < 0
    ? "text-red-400"
    : Number(account.balance) === 0
      ? "text-gray-400"
      : "text-green-400"

  const typeText = AccountType.find(type => type.id === account.type)?.name || 'Unknown';

  const toggleExpand = (e: React.MouseEvent) => {
    // Verifica se o clique veio dos botões
    const isButtonClick = (e.target as HTMLElement).closest('button');
    if (!isButtonClick) {
      setIsExpanded(v => !v);
    }
  };

  return (
    <>
      <tr aria-expanded={isExpanded} onClick={toggleExpand} className={`cursor-pointer table-row transition-colors border-b border-gray-700 ${isExpanded ? 'border-b-0' : 'hover:bg-gray-800/50'}`}>
        <td className={`hidden lg:flex px-4 py-3`}>
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

      {isExpanded && (
        <tr 
          onClick={toggleExpand}
          className="table-row transition-colors border-b border-gray-700"
          role="separator"
        >
          <td colSpan={4} className="px-4 py-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-gray-500">Tipo da Conta:  {typeText}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};