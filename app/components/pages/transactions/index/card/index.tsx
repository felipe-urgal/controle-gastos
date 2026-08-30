"use client";

import { useState } from "react";
import Link from "next/link";
import { FaCheck, FaCopy } from "react-icons/fa";

// importing components
import { ViewCard, ViewList } from "@/app/components/pages/transactions";

// importing services
import { transactionService } from "@/app/services/transaction-service";

// importing helpers
import { canCompleteTransaction } from "@/app/lib/transactions/transaction-quick-actions";

// importing interface
import { TransactionCardProps } from "@/app/lib/interface/transaction.interface";

export default function TransactionCard({
  transaction,
  viewMode,
  searchTerm = "",
  onChanged,
}: TransactionCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleComplete() {
    if (isCompleting) return;

    setIsCompleting(true);
    setFeedback(null);

    try {
      await transactionService.complete(transaction.id);

      try {
        await onChanged?.();
        setFeedback({ type: "success", message: "Transação concluída." });
      } catch {
        setFeedback({
          type: "success",
          message: "Transação concluída. Atualize a lista para rever os totais.",
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a transação.",
      });
    } finally {
      setIsCompleting(false);
    }
  }

  const canComplete = canCompleteTransaction(transaction.status);

  return (
    <div className="relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 hover:scale-[1.01]">
      <Link
        href={`/transacoes/show/${transaction.id}`}
        className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
        aria-label={`Ver transação ${transaction.description}`}
      >
        <div className="relative p-4 backdrop-blur-xl border bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-white/5">
          {viewMode === "list" ? (
            <ViewList transaction={transaction} searchTerm={searchTerm} />
          ) : (
            <ViewCard transaction={transaction} searchTerm={searchTerm} />
          )}
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-2 border-x border-b border-white/5 bg-slate-50/60 px-3 py-2 dark:bg-slate-950/20">
        <Link
          href={`/transacoes/nova?duplicate=${encodeURIComponent(transaction.id)}`}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:text-slate-200 dark:hover:bg-white/10"
          aria-label={`Duplicar transação ${transaction.description}`}
        >
          <FaCopy aria-hidden="true" />
          <span>Duplicar</span>
        </Link>

        {canComplete && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={isCompleting}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-wait disabled:opacity-60 dark:text-emerald-300"
            aria-label={`Concluir transação ${transaction.description}`}
          >
            <FaCheck aria-hidden="true" />
            <span>{isCompleting ? "Concluindo..." : "Concluir"}</span>
          </button>
        )}

        {feedback && (
          <span
            role={feedback.type === "error" ? "alert" : "status"}
            className={`text-xs ${
              feedback.type === "error"
                ? "text-red-700 dark:text-red-300"
                : "text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {feedback.message}
          </span>
        )}
      </div>
    </div>
  );
};
