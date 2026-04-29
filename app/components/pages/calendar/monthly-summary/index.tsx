"use client";

// importing components
import { MonthlySummarySkeleton } from '@/app/components/pages/calendar';

// importing libs
import { formatCurrency } from "@/app/lib/currency/format-currency";

interface MonthlySummaryProps {
  isLoading: boolean;
  additionalData: {
    income: number;
    expense: number;
    balance: number;
  };
};

export default function MonthlySummary({ isLoading, additionalData }: MonthlySummaryProps) {
  if (isLoading) return <MonthlySummarySkeleton />;

  return (
    <div className="p-3 flex items-center justify-between">

      <div>
        <p className="text-sm sm:text-2xl text-slate-500">Saldo do mês</p>
        <p className={`
          text-sm sm:text-2xl tracking-tight
          ${additionalData.balance < 0 ? "text-rose-500" : "text-emerald-500"}
        `}>
          {formatCurrency(additionalData.balance)}
        </p>
      </div>

      <div className="flex gap-10 text-sm sm:text-2xl">
        <div>
          <p className="text-slate-500 mb-1">Receitas</p>
          <p className="text-emerald-500">
            {formatCurrency(additionalData.income)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 mb-1">Despesas</p>
          <p className="text-rose-500">
            {formatCurrency(additionalData.expense)}
          </p>
        </div>
      </div>

    </div>
  );
}
