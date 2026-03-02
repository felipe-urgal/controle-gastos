"use client";

// importing libs
import { formatCurrency } from "@/app/lib/currency/formatCurrency";

interface Summary {
  income: number;
  expense: number;
  balance: number;
}

interface Props {
  summary?: Summary;
  loading?: boolean;
}

export default function TransactionSummary({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-slate-800/60 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const { income, expense, balance } = summary;

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {/* Income */}
      <div className="rounded-xl p-2 bg-green-500/10 border border-green-500/20">
        <p className="text-sm text-green-400 mb-1">Receitas</p>
        <p className="text-sm font-semibold text-green-300 text-end">
          {formatCurrency(income)}
        </p>
      </div>

      {/* Expense */}
      <div className="rounded-xl p-2 bg-red-500/10 border border-red-500/20">
        <p className="text-sm text-red-400 mb-1">Despesas</p>
        <p className="text-sm font-semibold text-red-300 text-end">
          {formatCurrency(expense)}
        </p>
      </div>

      {/* Balance */}
      <div className="rounded-xl p-2 bg-blue-500/10 border border-blue-500/20">
        <p className="text-sm text-blue-400 mb-1">Saldo</p>
        <p
          className={`text-sm font-semibold text-end ${
            balance >= 0 ? "text-blue-300" : "text-red-300"
          }`}
        >
          {formatCurrency(balance)}
        </p>
      </div>
    </div>
  );
}