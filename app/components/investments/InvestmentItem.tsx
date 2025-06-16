// Hooks
import { useRouter } from "next/navigation";
import { useState } from "react";

// Icons
import { FaTrash, FaPencilAlt } from "react-icons/fa";

// Utils
import { formatCurrency } from "@/app/utils/format";

// Types
import { InvestmentModel } from "@/app/types/investment";

// Toast
import { toast } from "react-toastify";

type InvestmentItemProps = {
  investment: InvestmentModel;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

export const InvestmentItem = ({ investment, onDelete, isDeleting = false }: InvestmentItemProps) => {
  const router = useRouter();

  const [isExpanded, setIsExpanded] = useState(false);

  const investmentDate = new Date(investment.investmentDate!);
  const dia = investmentDate.getDate().toString().padStart(2, '0');
  const mes = (investmentDate.getMonth() + 1).toString().padStart(2, '0');
  const ano = investmentDate.getFullYear();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede a propagação para o toggleExpand
    try {
      await onDelete(investment.id);
    } catch (error) {
      toast.error("Erro ao excluir investimento");
      console.error("Erro ao excluir investimento:", error);
    }
  };

  const handleEditar = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede a propagação para o toggleExpand
    router.push(`/investimentos/${investment.id}`);
  };

  const amountColor = investment.type === "BUY"
    ? "text-green-400"
    : "text-red-400"

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
        <td className="hidden lg:table-cell px-4 py-3 text-xs lg:text-sm text-gray-400">
          {`${dia}/${mes}/${ano}`}
        </td>
        <td className="px-4 py-3 text-xs lg:text-sm font-medium text-gray-400">
          {investment.description}
        </td>
        <td className="hidden lg:table-cell px-4 py-3">
          {investment.account?.name && (
            <span className="bg-gray-700/50 px-2 py-2 rounded-md text-xs text-gray-400">
              {investment.account.name}
            </span>
          )}
        </td>
        <td className="hidden lg:table-cell px-4 py-3 text-xs lg:text-sm font-medium text-gray-400">
          {investment.quantity}
        </td>
        <td className={`hidden lg:table-cell px-4 py-3 text-xs lg:text-sm font-medium ${amountColor}`}>
          {formatCurrency(investment.unitPrice)}
        </td>
        <td className={`px-4 py-3 text-right font-semibold text-xs lg:text-sm ${amountColor}`}>
          {formatCurrency(investment.amount)}
        </td>
        <td className="">
          <div className="flex justify-end">
            <button
              onClick={handleEditar}
              className="cursor-pointer text-blue-500 hover:text-blue-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
              aria-label="Editar investimento"
            >
              <FaPencilAlt className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
              aria-label="Excluir investimento"
            >
              {isDeleting ? (
                <span className="animate-spin inline-block h-4 w-4">...</span>
              ) : (
                <FaTrash className="h-4 w-4" />
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
            <div className="flex items-center gap-4">
              {/* Date */}
              <div className="flex items-center flex-col text-gray-400 text-xs">
                Data investimento: 
                <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{`${dia}/${mes}/${ano}`}</span>
              </div>

              <div className="flex items-center flex-col text-gray-400 text-xs">
                Quantidade: 
                <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{investment.quantity}</span>
              </div>

              <div className="flex items-center flex-col text-gray-400 text-xs">
                Valor Unitário: 
                <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{formatCurrency(investment.unitPrice)}</span>
              </div>

              {investment.account?.name && (
                <div className="flex items-center flex-col text-gray-400 text-xs">
                  Conta: 
                  <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{investment.account.name}</span>
                </div>
              )}
              
            </div>
          </td>
        </tr>
      )}
    </>
  );
};