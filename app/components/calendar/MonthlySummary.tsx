"use client";

import { useAuth } from '@/app/context/AuthContext';
import { MonthlySummarySkeleton } from '@/app/components';
import { formatCurrency } from '@/app/utils/calendarUtils';
import { useThemeColors } from '@/app/hook/useThemeColors';

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

  if (isLoading) {
    return <MonthlySummarySkeleton />;
  }

  // CORREÇÃO: Converter strings para números
  const income = parseFloat(additionalData.income) || 0;
  const expenses = parseFloat(additionalData.expenses) || 0;
  const currentMonthBalance = (income - expenses) / 100;

  return (
    <div className="mb-2 mx-3 w-full">
      {/* Grid principal para desktop */}
      <div className="hidden sm:flex items-center justify-center w-full">
        <div className="grid grid-cols-12 gap-3 w-full">
          {/* SALDO DO MÊS ATUAL */}
          <div className={`${colors.colors.success.bg} ${colors.colors.success.border} p-2 rounded-3xl border flex flex-col items-center w-full`}>
            <span className={`text-xs ${colors.colors.success.text} font-medium`}>Saldo do Mês</span>
            <span className={`text-xs font-bold ${colors.colors.success.text}`}>
              {user?.showValues ? formatCurrency(currentMonthBalance) : '*****'}
            </span>
            <div className="text-[10px] text-gray-500 mt-1 text-center">
              {user?.showValues && (
                <div>Receitas - Despesas</div>
              )}
            </div>
          </div>          
        </div>
      </div>

      {/* Grid simplificado para mobile */}
      <div className="sm:hidden">
        <div className="grid grid-cols-4">
          <div className={`${colors.colors.success.bg} rounded-l-xl pl-3 py-1 flex flex-col`}>
            <span className={`text-[10px] ${colors.colors.success.text} font-medium`}>Saldo Mês</span>
            <span className={`text-xs font-bold ${colors.colors.success.text}`}>
              {user?.showValues ? formatCurrency(currentMonthBalance) : '***'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
