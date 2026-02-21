'use client';

import { useRouter } from "next/navigation";
import { TransactionModel } from "@/app/types/transaction";
import { CategoryModel } from "@/app/types/category";
import { motion } from "framer-motion";
import { 
  FaArrowUp, 
  FaArrowDown, 
  FaRegClock,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import IconRenderer from "@/app/components/ui/IconRenderer"; // ← Importar o IconRenderer
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  transaction: TransactionModel;
  category?: CategoryModel;
  searchTerm?: string;
}

export default function TransactionListCard({
  transaction,
  category,
  searchTerm = "",
}: Props) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/transacoes/show/${transaction.id}`);
  };

  const highlightText = (text: string) => {
    if (!searchTerm || !text) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-purple-500/30 text-white rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'COMPLETED':
        return <FaCheckCircle className="text-green-400" />;
      case 'PENDING':
        return <FaRegClock className="text-yellow-400" />;
      case 'CANCELLED':
        return <FaTimesCircle className="text-red-400" />;
      default:
        return null;
    }
  };

  const transactionDate = new Date(
    transaction.year, 
    transaction.month - 1, 
    transaction.day
  );

  return (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className="
        cursor-pointer relative
        p-4 rounded-xl
        backdrop-blur-sm border
        bg-white/5 hover:bg-white/[0.07]
        border-white/10 hover:border-purple-500/40
        transition-all
      "
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Ícone de tipo */}
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center shrink-0
            ${transaction.type === "INCOME" 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
            }
          `}>
            {transaction.type === "INCOME" 
              ? <FaArrowUp size={20} /> 
              : <FaArrowDown size={20} />
            }
          </div>

          {/* Informações principais */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-white truncate">
                {highlightText(transaction.description || "Sem descrição")}
              </p>
              
              {/* Badge de categoria - AGORA USANDO IconRenderer */}
              {category && (
                <span className="
                  text-xs px-2 py-0.5 rounded-full 
                  bg-purple-500/20 text-purple-400 
                  border border-purple-500/30 
                  flex items-center gap-1 shrink-0
                ">
                  <span className="text-xs">
                    <IconRenderer 
                      iconName={category.icon || 'tag'} 
                      size={12}
                      className="text-purple-400"
                    />
                  </span>
                  {category.name}
                </span>
              )}
              
              {/* Badge de status */}
              <span className={`
                text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0
                ${transaction.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                ${transaction.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : ''}
                ${transaction.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''}
              `}>
                {getStatusIcon()}
                <span>
                  {transaction.status === 'COMPLETED' && 'Concluída'}
                  {transaction.status === 'PENDING' && 'Pendente'}
                  {transaction.status === 'CANCELLED' && 'Cancelada'}
                </span>
              </span>
            </div>
            
            {/* Data */}
            <p className="text-xs text-slate-500 mt-1">
              {format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Valor */}
          <div className="text-right">
            <p className={`font-semibold text-lg ${
              transaction.type === "INCOME" ? "text-green-400" : "text-red-400"
            }`}>
              {transaction.type === "INCOME" ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
