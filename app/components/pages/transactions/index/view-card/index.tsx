"use client";

// importing icons
import { FaRegClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

// importing components
import { IconRenderer } from "@/app/components/ui";

// importing libs
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/app/lib/currency/format-currency";
import { highlightText } from "@/app/lib/string/highlight-text";

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
    <div className="">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white line-clamp-2">
            {highlightText(transaction.description, searchTerm)}
          </h3>

          {transaction.category && (
            <div className="flex items-center gap-2 text-xs text-purple-400">
              <IconRenderer
                iconName={transaction.category.icon || "tag"}
                size={12}
                className="text-purple-400"
              />
              <span>{transaction.category.name}</span>
            </div>
          )}

          <span className="text-xs text-slate-500">{transaction.account.name}</span>
        </div>

        <div className="text-sm flex items-center gap-2">
          {getStatusIcon()}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{format(transactionDate, "dd MMM yyyy", { locale: ptBR })}</span>
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
