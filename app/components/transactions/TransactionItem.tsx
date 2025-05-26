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
      // toast.success("Transação excluída com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir transação");
      console.error("Erro ao excluir transação:", error);
    } finally {
    }
  };

  const handleEditar = () => {
    router.push(`/dashboard/${ano}/${mes}/${transaction.id}`);
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors group">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                transaction.tipo === "renda"
                  ? "bg-green-100 text-green-600"
                  : transaction.tipo === "despesa"
                  ? "bg-red-100 text-red-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {transaction.tipo === "renda" ? (
                <HiOutlineArrowUp className="h-4 w-4" />
              ) : transaction.tipo === "despesa" ? (
                <HiOutlineArrowDown className="h-4 w-4" />
              ) : (
                <HiOutlineDocumentReport className="h-4 w-4" />
              )}
            </span>
            <div>
              <p className="font-medium text-gray-800">{transaction.descricao}</p>
              <p className="text-xs text-gray-500">
                {dia.toString().padStart(2, "0")}/{mes.toString().padStart(2, "0")}/{ano} •{" "}
                {categoria?.nome || "Sem categoria"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <p
              className={`font-semibold ${
                transaction.tipo === "renda"
                  ? "text-green-600"
                  : transaction.tipo === "despesa"
                  ? "text-red-600"
                  : "text-blue-600"
              }`}
            >
              {formatCurrency(transaction.valor)}
            </p>
            <p className="text-xs text-gray-500">
              {transaction.tipo === "renda"
                ? "Renda"
                : transaction.tipo === "despesa"
                ? "Despesa"
                : "Investimento"}
            </p>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              variant="primary"
              // size="sm"
              onClick={() => handleEditar()}
              className="text-gray-500 hover:text-blue-600"
              aria-label="Editar transação"
            >
              <HiOutlinePencil className="h-4 w-4" />
            </Button>
            
            <Button
              variant="danger"
              // size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-gray-500 hover:text-red-600"
              aria-label="Excluir transação"
            >
              {isDeleting ? (
                <span className="animate-spin">...</span>
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