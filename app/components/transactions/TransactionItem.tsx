import { 
  HiOutlineArrowUp, 
  HiOutlineArrowDown, 
  HiOutlineDocumentReport,
  HiOutlineTrash,
  HiOutlinePencil
} from "react-icons/hi";
import { formatCurrency } from "@/app/utils/format";
import { TransactionModel } from "@/app/types/transaction";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type TransactionItemProps = {
  transaction: TransactionModel;
  onDelete: (transaction: TransactionModel) => Promise<void>;
  isDeleting?: boolean;
};

export const TransactionItem = ({ 
  transaction, 
  onDelete,
  isDeleting = false
}: TransactionItemProps) => {
  const dataTransacao = new Date(transaction.transactionDate!);
  const dia = dataTransacao.getDate().toString().padStart(2, '0');
  const mes = (dataTransacao.getMonth() + 1).toString().padStart(2, '0');
  const ano = dataTransacao.getFullYear();
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await onDelete(transaction);
    } catch (error) {
      toast.error("Erro ao excluir transação");
      console.error("Erro ao excluir transação:", error);
    }
  };

  const handleEditar = () => {
    router.push(`/transacoes/${transaction.id}`);
  };

  const typeIcon = transaction.type === "INCOME" ? (
    <HiOutlineArrowUp className="h-4 w-4 text-green-500" />
  ) : transaction.type === "EXPENSE" ? (
    <HiOutlineArrowDown className="h-4 w-4 text-red-500" />
  ) : (
    <HiOutlineDocumentReport className="h-4 w-4 text-blue-500" />
  );

  const typeText = transaction.type === "INCOME" 
    ? "Entrada" 
    : transaction.type === "EXPENSE" 
      ? "Saída" 
      : "Investimento";

  const amountColor = transaction.type === "INCOME"
    ? "text-green-400"
    : transaction.type === "EXPENSE"
      ? "text-red-400"
      : "text-blue-400";

  return (
    <>
      {/* Desktop Table Row */}
      <tr className="hidden md:table-row hover:bg-gray-800/50 transition-colors border-b border-gray-700">
        <td className="px-4 py-5 text-sm text-gray-400">
          {`${dia}/${mes}/${ano}`}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center rounded-full p-1 ${
              transaction.type === "INCOME" 
                ? "bg-green-900/30" 
                : transaction.type === "EXPENSE" 
                  ? "bg-red-900/30" 
                  : "bg-blue-900/30"
            }`}>
              {typeIcon}
            </span>
            <span className="text-sm text-gray-400">{typeText}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-400">
          {transaction.description}
        </td>
        <td className="px-4 py-3">
          {transaction.category?.name && (
            <span className="bg-gray-700/50 px-2 py-2 rounded-md text-xs text-gray-400">
              {transaction.category.name}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
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

      {/* Mobile List Item */}
      <tr className="md:hidden">
        <td colSpan={7} className="p-0 border-b border-gray-700">
          <div className="px-6 py-2 hover:bg-gray-800/50 transition-colors">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-gray-100 truncate">
                  {transaction.description}
                </p>
                <p className="text-sm text-gray-400">
                  {`${dia}/${mes}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {transaction.category?.name && (
                    <span className="bg-gray-700/50 px-2 py-1 rounded-md text-xs text-gray-400 truncate max-w-[120px]">
                      {transaction.category.name}
                    </span>
                  )}
                  {transaction.account?.name && (
                    <span className="bg-gray-700/50 px-2 py-1 rounded-md text-xs text-gray-400 truncate max-w-[120px]">
                      {transaction.account.name}
                    </span>
                  )}
                  <p className={`font-semibold ${amountColor}`}>
                    {formatCurrency(transaction.amount)}
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