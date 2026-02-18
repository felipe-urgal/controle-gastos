"use client";

import { useAuth } from '@/app/context';
import { MonthlySummarySkeleton } from '@/app/components';
import { formatCurrency } from '@/app/utils';
import { useThemeColors } from '@/app/hook';

interface MonthlySummaryProps {
  isLoading: boolean;
  additionalData: {
    income: string;
    expenses: string;
  };
}

export default function MonthlySummary({
  isLoading,
  additionalData,
}: MonthlySummaryProps) {

  const { user } = useAuth();
  const colors = useThemeColors();

  if (isLoading) return <MonthlySummarySkeleton />;

  const income = parseFloat(additionalData.income) || 0;
  const expenses = parseFloat(additionalData.expenses) || 0;
  const balance = income - expenses;

  const isNegative = balance < 0;

  return (
    <div className="px-4 sm:px-8 py-4 sm:py-8">
      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm sm:text-2xl text-slate-500">Saldo do mês</p>
          <p className={`
            text-sm sm:text-2xl tracking-tight
            ${isNegative ? "text-rose-500" : "text-emerald-500"}
          `}>
            {user?.showValues ? formatCurrency(balance) : "••••"}
          </p>
        </div>

        <div className="flex gap-10 text-sm sm:text-2xl">
          <div>
            <p className="text-slate-500 mb-1">Receitas</p>
            <p className="text-emerald-500">
              {user?.showValues ? formatCurrency(income) : "•••"}
            </p>
          </div>

          <div>
            <p className="text-slate-500 mb-1">Despesas</p>
            <p className="text-rose-500">
              {user?.showValues ? formatCurrency(expenses) : "•••"}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
