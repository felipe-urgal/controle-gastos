import { 
  HiOutlineArrowUp, 
  HiOutlineArrowDown, 
  HiOutlineDocumentReport,
  HiOutlineTrash,
  HiOutlinePencil
} from "react-icons/hi";
import { formatCurrency } from "@/app/utils/format";
import { Transacao } from "@/app/services/transacoesService";
import { Categoria } from "@/app/types/transacao";
import { Button } from "../ui/Button";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type TransactionItemProps = {
  transaction: Transacao;
  categories: Categoria[];
  onDelete: (id: number) => Promise<void>;
  isDeleting?: boolean;
};

export const TransactionItem = ({ 
  transaction, 
  categories,
  onDelete,
  isDeleting = false
}: TransactionItemProps) => {
  const dataTransacao = new Date(transaction.data);
  const dia = dataTransacao.getDate();
  const mes = dataTransacao.getMonth() + 1;
  const ano = dataTransacao.getFullYear();
  const categoria = categories.find((c) => c.id === transaction.categoriaId);
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
    router.push(`/dashboard/${ano}/${mes}/${transaction.id}`);
  };

  return (
    <div 
      className="p-3 sm:p-4 hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-b-0"
      onClick={(e) => {
        // Se o clique não foi em um botão, abre os detalhes
        if (!(e.target as HTMLElement).closest('button')) {
          router.push(`/dashboard/${ano}/${mes}/${transaction.id}`);
        }
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4">
        {/* Left side - Transaction info */}
        <div className="flex-1 flex items-start gap-3">
          {/* Icon */}
          <div
            className={`flex-shrink-0 inline-flex items-center justify-center h-10 w-10 sm:h-8 sm:w-8 rounded-full ${
              transaction.tipo === "renda"
                ? "bg-green-100 text-green-600"
                : transaction.tipo === "despesa"
                ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            {transaction.tipo === "renda" ? (
              <HiOutlineArrowUp className="h-5 w-5 sm:h-4 sm:w-4" />
            ) : transaction.tipo === "despesa" ? (
              <HiOutlineArrowDown className="h-5 w-5 sm:h-4 sm:w-4" />
            ) : (
              <HiOutlineDocumentReport className="h-5 w-5 sm:h-4 sm:w-4" />
            )}
          </div>
          
          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{transaction.descricao}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
              <span>
                {dia.toString().padStart(2, "0")}/{mes.toString().padStart(2, "0")}/{ano}
              </span>
              {categoria?.nome && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                    {categoria.nome}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Value and actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          {/* Value */}
          <div className="text-right">
            <p
              className={`font-semibold text-sm sm:text-base ${
                transaction.tipo === "renda"
                  ? "text-green-600"
                  : transaction.tipo === "despesa"
                  ? "text-red-600"
                  : "text-blue-600"
              }`}
            >
              {formatCurrency(transaction.valor)}
            </p>
            <p className="text-xs text-gray-500 hidden sm:block">
              {transaction.tipo === "renda"
                ? "Renda"
                : transaction.tipo === "despesa"
                ? "Despesa"
                : "Investimento"}
            </p>
          </div>
          
          {/* Actions - Always visible on mobile, hover on desktop */}
          <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button
              variant="primary"
              onClick={() => {handleEditar();}}
              className="text-gray-500 hover:text-blue-600 p-1 sm:p-1.5"
              aria-label="Editar transação"
            >
              <HiOutlinePencil className="h-4 w-4" />
            </Button>
            
            <Button
              variant="danger"
              onClick={() => {handleDelete()}}
              disabled={isDeleting}
              className="text-gray-500 hover:text-red-600 p-1 sm:p-1.5"
              aria-label="Excluir transação"
            >
              {isDeleting ? (
                <span className="animate-spin inline-block h-4 w-4">...</span>
              ) : (
                <HiOutlineTrash className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};