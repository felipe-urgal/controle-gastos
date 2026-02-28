"use client";

// importing icons
import { FaArrowUp, FaArrowDown, FaRegClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

// importing components
import { IconRenderer } from "@/app/components/ui";

// importing libs
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/app/lib/currency/formatCurrency";
import { highlightText } from "@/app/lib/string/highlightText";

// importing interface
import { ViewProps } from "@/app/lib/interface/transaction.interface";

export default function ViewCard({ transaction, searchTerm = "" }: ViewProps) {
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

  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);

  const typeIsIncome = transaction.type === "INCOME";

  return (
    <div
      className={`relative p-5 backdrop-blur-xl border ${typeIsIncome ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeIsIncome ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {typeIsIncome ? <FaArrowUp /> : <FaArrowDown />}
        </div>

        <div className="text-sm flex items-center gap-2">
          {getStatusIcon()}
        </div>
      </div>

      <h3 className="font-semibold text-white mb-2 line-clamp-2">
        {highlightText(transaction.description, searchTerm)}
      </h3>

      {transaction.category && (
        <div className="flex items-center gap-2 text-xs text-purple-400 mb-3">
          <IconRenderer
            iconName={transaction.category.icon || "tag"}
            size={12}
            className="text-purple-400"
          />
          <span>{transaction.category.name}</span>
        </div>
      )}

      <p className="text-xs text-slate-500 mb-4">
        {format(transactionDate, "dd MMM yyyy", { locale: ptBR })}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Valor</span>
        <span
          className={`text-lg font-bold ${
            typeIsIncome ? "text-green-400" : "text-red-400"
          }`}
        >
          {typeIsIncome ? "+" : "-"}
          {formatCurrency(transaction.amount, transaction.account.currency)}
        </span>
      </div>
    </div>
  );
};
