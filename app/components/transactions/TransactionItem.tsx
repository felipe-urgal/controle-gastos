// Hooks
import { useRouter } from "next/navigation";
import { useState } from "react";

// Icons
import { HiOutlineTrash, HiOutlinePencil } from "react-icons/hi";

// Utils
import { formatCurrency } from "@/app/utils/format";

// Types
import { TransactionModel } from "@/app/types/transaction";

// Toast
import { toast } from "react-toastify";

type TransactionItemProps = {
  transaction: TransactionModel;
  onDelete: (transaction: TransactionModel) => Promise<void>;
  isDeleting?: boolean;
};

export const TransactionItem = ({ transaction, onDelete, isDeleting = false }: TransactionItemProps) => {
  const router = useRouter();

  const [isExpanded, setIsExpanded] = useState(false);

  const dataTransacao = new Date(transaction.transactionDate!);
  const dia = dataTransacao.getDate().toString().padStart(2, '0');
  const mes = (dataTransacao.getMonth() + 1).toString().padStart(2, '0');
  const ano = dataTransacao.getFullYear();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede a propagação para o toggleExpand
    try {
      await onDelete(transaction);
    } catch (error) {
      toast.error("Erro ao excluir transação");
      console.error("Erro ao excluir transação:", error);
    }
  };

  const handleEditar = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede a propagação para o toggleExpand
    router.push(`/transacoes/${transaction.id}`);
  };

  const amountColor = transaction.type === "INCOME"
    ? "text-green-400"
    : transaction.type === "EXPENSE"
      ? "text-red-400"
      : "text-blue-400";

  const toggleExpand = (e: React.MouseEvent) => {
    // Verifica se o clique veio dos botões
    const isButtonClick = (e.target as HTMLElement).closest('button');
    if (!isButtonClick) {
      setIsExpanded(v => !v);
    }
  };

  return (
    <>
      <tr aria-expanded={isExpanded} onClick={toggleExpand} className={`cursor-pointer lg:cursor-default transition-colors border-b border-gray-700 ${isExpanded ? 'border-b-0 lg:border-b' : 'hover:md:bg-gray-800/50 hover:lg:bg-gray-800/0'}`}>
        <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-400">
          {`${dia}/${mes}/${ano}`}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-400">
          {transaction.description}
        </td>
        <td className="hidden lg:table-cell px-4 py-3">
          {transaction.category?.name && (
            <span className="bg-gray-700/50 px-2 py-2 rounded-md text-xs text-gray-400">
              {transaction.category.name}
            </span>
          )}
        </td>
        <td className="hidden lg:table-cell px-4 py-3">
          {transaction.account?.name && (
            <span className="bg-gray-700/50 px-2 py-2 rounded-md text-xs text-gray-400">
              {transaction.account.name}
            </span>
          )}
        </td>
        <td className={`px-4 py-3 text-right font-semibold ${amountColor}`}>
          {formatCurrency(transaction.amount)}
        </td>
        <td className="">
          <div className="flex justify-end">
            <button
              onClick={handleEditar}
              className="cursor-pointer text-blue-500 hover:text-blue-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
              aria-label="Editar transação"
            >
              <HiOutlinePencil className="h-4 w-4" />
            </button>
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

      {isExpanded && (
        <tr 
          className="lg:hidden table-cell table-row  border-b border-gray-700"
          role="separator" // Accessibility improvement
          aria-label={`Transactions for ${dia}/${mes}/${ano}`}
        >
          <td colSpan={6} className="px-4 py-3">
            <div className="flex items-center justify-center gap-2">
              {/* Date */}
              <div className="text-gray-400 text-xs">
                Data transação: {`${dia}/${mes}/${ano}`}
              </div>
              
              {/* Category badge - only show if exists */}
              {transaction.category?.name && (
                <span className="bg-gray-700/50 px-2 py-1 text-xs rounded-md text-gray-400">
                  Categoria: {transaction.category.name}
                </span>
              )}
              
              {/* Account badge - only show if exists */}
              {transaction.account?.name && (
                <span className="bg-gray-700/50 px-2 py-1 text-xs rounded-md text-gray-400">
                  Conta: {transaction.account.name}
                </span>
              )}
              
              {/* Fallback when no category/account */}
              {!transaction.category?.name && !transaction.account?.name && (
                <span className="text-gray-500 italic">No details</span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};