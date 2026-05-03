"use client";

// importing icons
import {
  FaArrowUp,
  FaArrowDown,
  FaTag,
  FaWallet,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

// importing libs
import { formatCurrency } from "@/app/lib/currency/format-currency";

interface TransactionCardProps {
  transaction: any;
  onEdit?: (transaction: any) => void;
  onDelete?: (transaction: any) => void;
  isBusy?: boolean;
}

export default function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  isBusy = false,
}: TransactionCardProps) {
  const isIncome = transaction.type === "INCOME";

  return (
    <div
      className={`
        relative p-3 sm:p-4
        rounded-xl sm:rounded-2xl
        backdrop-blur-xl
        border transition-all
        hover:scale-[1.01]
        ${
          isIncome
            ? "bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-green-500/20"
            : "bg-gradient-to-r from-red-500/5 to-rose-500/5 border-red-500/20"
        }
      `}
    >
      <div className="relative">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
            
            {/* ícone */}
            <div
              className={`
                w-8 h-8 sm:w-10 sm:h-10
                rounded-lg sm:rounded-xl
                flex items-center justify-center shrink-0
                ${
                  isIncome
                    ? "bg-green-500/20 text-[var(--success)]"
                    : "bg-red-500/20 text-[var(--danger)]"
                }
              `}
            >
              {isIncome ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />}
            </div>

            {/* conteúdo */}
            <div className="min-w-0 flex-1">
              <h3 className="font-medium sm:font-semibold text-white text-sm sm:text-base truncate pr-2">
                {transaction.description || "Sem descrição"}
              </h3>

              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                
                {/* categoria */}
                {transaction.category && (
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] flex items-center gap-1 border border-[var(--border)]">
                    <FaTag size={8} className="text-[var(--text-muted)]" />
                    <span className="truncate max-w-[80px] sm:max-w-none">
                      {transaction.category.name}
                    </span>
                  </span>
                )}

                {/* conta */}
                {transaction.account && (
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] flex items-center gap-1 border border-[var(--border)]">
                    <FaWallet size={8} className="text-[var(--text-muted)]" />
                    <span className="truncate max-w-[80px] sm:max-w-none">
                      {transaction.account.name}
                    </span>
                  </span>
                )}

                {/* status */}
                {transaction.status === "PENDING" && (
                  <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full font-semibold text-[var(--warning)] bg-[var(--warning-soft)] border border-[rgba(245,158,11,0.18)]">
                    Pendente
                  </span>
                )}

                {transaction.status === "CANCELLED" && (
                  <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full font-semibold text-[var(--danger)] bg-[var(--danger-soft)] border border-[rgba(239,68,68,0.18)]">
                    Cancelado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* valor */}
          <div className="flex items-center gap-1 sm:gap-2">
            <span
              className={`text-sm sm:text-lg font-bold whitespace-nowrap ${
                isIncome ? "text-[var(--success)]" : "text-[var(--danger)]"
              }`}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>

        {/* ações */}
        {(onEdit || onDelete) && (
          <div className="flex justify-end gap-2 mt-3">
            
            {onEdit && (
              <button
                onClick={() => !isBusy && onEdit(transaction)}
                disabled={isBusy}
                className="text-xs px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition flex items-center gap-1 disabled:opacity-50"
              >
                <FaEdit size={10} />
                Editar
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => !isBusy && onDelete(transaction)}
                disabled={isBusy}
                className="text-xs px-2 py-1 rounded-lg border transition flex items-center gap-1 disabled:opacity-50"
                style={{
                  color: "var(--danger)",
                  backgroundColor: "rgba(239,68,68,0.08)",
                  borderColor: "rgba(239,68,68,0.16)",
                }}
              >
                <FaTrash size={10} />
                Remover
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
