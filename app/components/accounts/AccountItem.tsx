import { HiOutlineTrash, HiOutlinePencil } from "react-icons/hi";
import { formatCurrency } from "@/app/utils/format";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  userId: string;
}

type AccountItemProps = {
  account: Account;
  onDelete: (id: string) => Promise<void>;
  isDeleting?: boolean;
};

export const AccountItem = ({ 
  account, 
  onDelete,
  isDeleting = false
}: AccountItemProps) => {
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

  return (
    <div 
      className="p-3 sm:p-4 transition-colors group border-b border-gray-700 last:border-b-0"
    >
      <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4">
        {/* Left side - Transaction info */}
        <div className="flex-1 flex items-start gap-3">
          {/* Icon */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-600">
              <p className="font-medium text-gray-400 truncate">{account.name}</p>
            </div>
          </div>
        </div>

        {/* Right side - Value and actions */}
        <div className="flex items-center justify-between sm:justify-end gap-10">
          {/* Value */}
          <div className="text-right text-gray-600">
            <p>
              {formatCurrency(account.balance)}
            </p>
          </div>
          
          {/* Actions - Always visible on mobile, hover on desktop */}
          <div className="flex gap-1 transition-opacity">
            <button
              onClick={() => {handleEditar();}}
              className="text-blue-500 hover:text-blue-700 p-2"
              aria-label="Editar conta"
            >
              <HiOutlinePencil className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => {handleDelete()}}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 p-2"
              aria-label="Excluir conta"
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