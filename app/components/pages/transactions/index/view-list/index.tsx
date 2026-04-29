"use client";

// importing icons
import { FaArrowUp, FaArrowDown } from "react-icons/fa";

// importing libs
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/app/lib/currency/format-currency";
import { highlightText } from "@/app/lib/string/highlight-text";

// importing interface
import { ViewProps } from "@/app/lib/interface/transaction.interface";

export default function ViewList({ transaction, searchTerm = "" }: ViewProps) {
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);

  const typeIsIncome = transaction.type === "INCOME";

  return (
    <div className="flex items-center justify-between gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${typeIsIncome? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
        {typeIsIncome ? <FaArrowUp /> : <FaArrowDown />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {highlightText(transaction.description, searchTerm)}
        </p>

        <p className="text-xs text-slate-500 mt-1">
          {format(transactionDate, "dd 'de' MMM yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="text-right">
        <p
          className={`font-semibold ${
            typeIsIncome ? "text-green-400" : "text-red-400"
          }`}
        >
          {typeIsIncome ? "+" : "-"}
          {formatCurrency(transaction.amount, transaction.account.currency)}
        </p>
      </div>
    </div>
  );
};
