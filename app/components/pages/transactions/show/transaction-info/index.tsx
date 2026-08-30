"use client";

import { FaArrowUp, FaArrowDown, FaCalendarAlt, FaTag, FaWallet, FaInfoCircle, FaRepeat } from "react-icons/fa";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IconRenderer } from "@/app/components/ui";
import { TransactionInfoProps } from "@/app/lib/interface/transaction.interface";
import { formatCurrency } from "@/app/lib/currency/format-currency";
import { statusConfig } from "@/app/lib/constants/transaction.constants";
import { formatPtBrLogicalDate } from "@/app/lib/transactions/monthly-recurrence";

export default function TransactionInfo({
  transaction,
  isDeleting = false,
}: TransactionInfoProps) {
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const status =
    statusConfig[transaction.status as keyof typeof statusConfig] ||
    statusConfig.COMPLETED;

  return (
    <div className={`space-y-6 transition-opacity duration-300 ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl ${transaction.type === "INCOME" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {transaction.type === "INCOME" ? <FaArrowUp /> : <FaArrowDown />}
          </div>

          <div>
            <span className={`text-xs px-2 py-1 rounded-full border ${status.color}`}>
              {status.label}
            </span>

            <h2 className="text-2xl font-bold text-white mt-2">
              {transaction.description || "Sem descrição"}
            </h2>
          </div>
        </div>

        {transaction.series && (
          <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-slate-200">
            <div className="flex items-center gap-2 font-semibold text-purple-200">
              <FaRepeat aria-hidden="true" />
              Parte de uma série mensal
            </div>
            <p className="mt-1 text-slate-300">
              {transaction.series.occurrenceCount} ocorrências, de{" "}
              {formatPtBrLogicalDate(transaction.series.start)} até{" "}
              {formatPtBrLogicalDate(transaction.series.end)}. Editar esta transação
              altera somente esta ocorrência.
            </p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">
            Valor
          </p>
          <h1
            className={`text-5xl font-bold ${
              transaction.type === "INCOME" ? "text-green-400" : "text-red-400"
            }`}
          >
            {transaction.type === "INCOME" ? "+" : "-"}
            {formatCurrency(transaction.amount, transaction.account.currency)}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-1">Data</p>
            <p className="text-sm text-white flex items-center gap-2">
              <FaCalendarAlt size={12} className="text-slate-400" />
              {format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-1">Criada em</p>
            <p className="text-sm text-white flex items-center gap-2">
              <FaCalendarAlt size={12} className="text-slate-400" />
              {format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FaInfoCircle className="text-purple-400" />
          Informações Adicionais
        </h3>

        <div className="space-y-4">
          {transaction.category && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
              <div className="flex items-center gap-3">
                <FaTag className="text-purple-400 text-sm" />
                <span className="text-sm text-slate-300">Categoria</span>
              </div>

              <div className="flex items-center gap-2">
                <div style={{ color: transaction.category.color }}>
                  <IconRenderer
                    iconName={transaction.category.icon || "tag"}
                    size={16}
                  />
                </div>
                <span className="text-white font-medium">
                  {transaction.category.name}
                </span>
              </div>
            </div>
          )}

          {transaction.account && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40">
              <div className="flex items-center gap-3">
                <FaWallet className="text-blue-400 text-sm" />
                <span className="text-sm text-slate-300">Conta</span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: transaction.account.color ?? undefined }}
                >
                  <IconRenderer
                    iconName={transaction.account.icon || "wallet"}
                    size={12}
                    className="text-white"
                  />
                </div>

                <span className="text-white font-medium">
                  {transaction.account.name}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
