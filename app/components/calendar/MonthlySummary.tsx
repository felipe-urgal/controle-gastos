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

  // Determinar as cores baseadas no saldo
  const isNegative = currentMonthBalance < 0;
  const balanceColors = isNegative ? colors.colors.error : colors.colors.success;

  return (
    <div className="mb-2 mx-3 w-full">
      {/* Grid principal para desktop */}
      <div className="flex items-center justify-start">
        <div className={`${balanceColors.bg} rounded-3xl p-3 flex flex-row`}>
          <span className={`text-[10px] ${balanceColors.text} font-medium me-3`}>Saldo Mês: </span>
          <span className={`text-xs font-bold ${balanceColors.text}`}>
            {user?.showValues ? formatCurrency(currentMonthBalance) : '***'}
          </span>
        </div>
      </div>
    </div>
  );
};