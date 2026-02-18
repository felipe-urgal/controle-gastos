"use client";

import { formatCurrency } from "@/app/utils";

interface SummaryCardsProps {
  totalIncome?: number;
  totalExpenses?: number;
  showBalance?: boolean;
  user?: any;
}

export default function SummaryCards({
  totalIncome = 0,
  totalExpenses = 0,
  showBalance = true,
  user,
}: SummaryCardsProps) {
  const balance = totalIncome - totalExpenses;

  return (
    <div className="
      flex flex-col sm:flex-row
      sm:items-center
      sm:justify-between
      gap-4
      p-5
      rounded-2xl
      bg-white/5 dark:bg-slate-800/30
      backdrop-blur-xl
      border border-white/10
    ">
      {/* Saldo principal */}
      {showBalance && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            Saldo do dia
          </p>
          <p className={`text-2xl font-semibold mt-1 ${
            balance >= 0 ? "text-green-400" : "text-red-400"
          }`}>
            {user?.showValues
              ? formatCurrency(balance)
              : "••••"}
          </p>
        </div>
      )}

      {/* Receitas e despesas compactas */}
      <div className="flex gap-6 text-sm">
        <div>
          <p className="text-slate-400">Receitas</p>
          <p className="text-green-400 font-medium">
            {user?.showValues
              ? formatCurrency(totalIncome)
              : "••••"}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Despesas</p>
          <p className="text-red-400 font-medium">
            {user?.showValues
              ? formatCurrency(totalExpenses)
              : "••••"}
          </p>
        </div>
      </div>
    </div>
  );
}