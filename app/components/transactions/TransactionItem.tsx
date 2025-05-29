import { 
  HiOutlineArrowUp, 
  HiOutlineArrowDown, 
  HiOutlineDocumentReport,
  HiOutlineTrash,
  HiOutlinePencil
} from "react-icons/hi";
import { formatCurrency } from "@/app/utils/format";
import { Transacao } from "@/app/services/transacoesService";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type TransactionItemProps = {
  transaction: Transacao;
  onDelete: (id: number) => Promise<void>;
  isDeleting?: boolean;
};

export const TransactionItem = ({ 
  transaction, 
  onDelete,
  isDeleting = false
}: TransactionItemProps) => {
  const dataTransacao = new Date(transaction.transactionDate!);
  const dia = dataTransacao.getDate();
  const mes = dataTransacao.getMonth() + 1;
  const ano = dataTransacao.getFullYear();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await onDelete(transaction.id);
    } catch (error) {
      toast.error("Erro ao excluir transação");
      console.error("Erro ao excluir transação:", error);
    }
  };

  const handleEditar = () => {
    router.push(`/transacoes/${transaction.id}`);
  };

  return (
    <div className="p-4 transition-colors hover:bg-gray-800/50 group border-b border-gray-700 last:border-b-0">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        {/* Left side - Transaction info */}
        <div className="flex-1 flex items-start gap-3 min-w-0">
          {/* Type indicator */}
          <div className={`mt-1 flex-shrink-0 rounded-full p-2 ${
            transaction.type === "INCOME" 
              ? "bg-green-900/30 text-green-500" 
              : transaction.type === "EXPENSE" 
                ? "bg-red-900/30 text-red-500" 
                : "bg-blue-900/30 text-blue-500"
          }`}>
            {transaction.type === "INCOME" ? (
              <HiOutlineArrowUp className="h-4 w-4" />
            ) : transaction.type === "EXPENSE" ? (
              <HiOutlineArrowDown className="h-4 w-4" />
            ) : (
              <HiOutlineDocumentReport className="h-4 w-4" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-100 truncate">
                {transaction.description}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500">
                {dia}/{mes}/{ano}
              </span>
              
              {transaction.category?.name && (
                <span className="bg-gray-700/50 px-2 py-1 rounded-md text-gray-400">
                  {transaction.category.name}
                </span>
              )}
              
              {transaction.account?.name && (
                <span className="bg-gray-700/50 px-2 py-1 rounded-md text-gray-400">
                  {transaction.account.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Value and actions */}
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
          {/* Value */}
          <div className="text-right min-w-[100px]">
            <p
              className={`font-semibold text-base ${
                transaction.type === "INCOME"
                  ? "text-green-400"
                  : transaction.type === "EXPENSE"
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {formatCurrency(transaction.amount)}
            </p>
            <p className="text-xs text-gray-500">
              {transaction.type === "INCOME"
                ? "Entrada"
                : transaction.type === "EXPENSE"
                ? "Saída"
                : "Investimento"}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEditar}
              className="text-gray-400 hover:text-blue-400 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
              aria-label="Editar transação"
            >
              <HiOutlinePencil className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-gray-400 hover:text-red-400 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
              aria-label="Excluir transação"
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
  );
};