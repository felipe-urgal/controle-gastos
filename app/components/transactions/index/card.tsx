"use client";

import { useRouter } from "next/navigation";
import { TransactionDTO } from "@/app/types/transaction";
import { CategoryModel } from "@/app/types/category";
import { motion } from "framer-motion";
import {
  FaArrowUp,
  FaArrowDown,
  FaRegClock,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import IconRenderer from "@/app/components/ui/IconRenderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  transaction: TransactionDTO;
  category?: CategoryModel;
  searchTerm?: string;
  viewMode?: "list" | "grid";
  index?: number;
}

export default function TransactionCard({
  transaction,
  category,
  searchTerm = "",
  viewMode = "list",
  index = 0,
}: Props) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/transacoes/show/${transaction.id}`);
  };

  const highlightText = (text: string) => {
    if (!searchTerm || !text) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
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
      case "COMPLETED":
        return <FaCheckCircle className="text-green-400" />;
      case "PENDING":
        return <FaRegClock className="text-yellow-400" />;
      case "CANCELLED":
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

  const typeIsIncome = transaction.type === "INCOME";

  /* ===============================
     LIST MODE (igual ao seu atual)
  =============================== */

  if (viewMode === "list") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
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
        <div className="flex items-center justify-between gap-4">
          {/* Ícone */}
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center shrink-0
              ${
                typeIsIncome
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }
            `}
          >
            {typeIsIncome ? <FaArrowUp /> : <FaArrowDown />}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">
              {highlightText(transaction.description || "Sem descrição")}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              {format(transactionDate, "dd 'de' MMM yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Valor */}
          <div className="text-right">
            <p
              className={`font-semibold ${
                typeIsIncome ? "text-green-400" : "text-red-400"
              }`}
            >
              {typeIsIncome ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ===============================
     GRID MODE (novo)
  =============================== */

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="
        cursor-pointer group relative
        rounded-2xl overflow-hidden
        transition-all duration-300
        hover:shadow-2xl hover:shadow-purple-500/10
      "
    >
      <div
        className={`
          relative p-5
          backdrop-blur-xl border
          ${
            typeIsIncome
              ? "bg-green-500/5 border-green-500/20"
              : "bg-red-500/5 border-red-500/20"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${
                typeIsIncome
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }
            `}
          >
            {typeIsIncome ? <FaArrowUp /> : <FaArrowDown />}
          </div>

          <div className="text-sm flex items-center gap-2">
            {getStatusIcon()}
          </div>
        </div>

        {/* Descrição */}
        <h3 className="font-semibold text-white mb-2 line-clamp-2">
          {highlightText(transaction.description || "Sem descrição")}
        </h3>

        {/* Categoria */}
        {category && (
          <div className="flex items-center gap-2 text-xs text-purple-400 mb-3">
            <IconRenderer
              iconName={category.icon || "tag"}
              size={12}
              className="text-purple-400"
            />
            <span>{category.name}</span>
          </div>
        )}

        {/* Data */}
        <p className="text-xs text-slate-500 mb-4">
          {format(transactionDate, "dd MMM yyyy", { locale: ptBR })}
        </p>

        {/* Valor */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Valor</span>
          <span
            className={`text-lg font-bold ${
              typeIsIncome ? "text-green-400" : "text-red-400"
            }`}
          >
            {typeIsIncome ? "+" : "-"}
            {formatCurrency(transaction.amount)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
