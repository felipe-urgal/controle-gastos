"use client";

// importing components
import { MonthlySummarySkeleton } from '@/app/components/calendar';

// importing libs
import { formatCurrency } from "@/app/lib/currency/formatCurrency";

interface MonthlySummaryProps {
  isLoading: boolean;
  additionalData: {
    income: string;
    expenses: string;
  };
};

export default function MonthlySummary({ isLoading, additionalData }: MonthlySummaryProps) {
  if (isLoading) return <MonthlySummarySkeleton />;

  const income = parseFloat(additionalData.income) || 0;
  const expenses = parseFloat(additionalData.expenses) || 0;
  const balance = income - expenses;

  const isNegative = balance < 0;

  return (
    <div className="p-3 flex items-center justify-between">

      <div>
        <p className="text-sm sm:text-2xl text-slate-500">Saldo do mês</p>
        <p className={`
          text-sm sm:text-2xl tracking-tight
          ${isNegative ? "text-rose-500" : "text-emerald-500"}
        `}>
          {formatCurrency(balance)}
        </p>
      </div>

      <div className="flex gap-10 text-sm sm:text-2xl">
        <div>
          <p className="text-slate-500 mb-1">Receitas</p>
          <p className="text-emerald-500">
            {formatCurrency(income)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 mb-1">Despesas</p>
          <p className="text-rose-500">
            {formatCurrency(expenses)}
          </p>
        </div>
      </div>

    </div>
  );
}
