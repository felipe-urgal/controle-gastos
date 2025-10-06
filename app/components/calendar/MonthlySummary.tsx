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
  cumulativeBalance: number;
}

export default function MonthlySummary({
  isLoading,
  additionalData,
  cumulativeBalance,
}: MonthlySummaryProps) {
  const { user } = useAuth();
  const colors = useThemeColors();

  if (isLoading) {
    return <MonthlySummarySkeleton />;
  }

  const currentMonthBalance = parseFloat(additionalData.income) - parseFloat(additionalData.expenses);
  const totalBalance = cumulativeBalance + currentMonthBalance;

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

          {/* SALDO ACUMULADO (MESES ANTERIORES) */}
          <div className={`${colors.colors.info.bg} ${colors.colors.info.border} p-2 rounded-3xl border flex flex-col items-center w-full`}>
            <span className={`text-xs ${colors.colors.info.text} font-medium`}>Saldo Acumulado</span>
            <span className={`text-xs font-bold ${colors.colors.info.text}`}>
              {user?.showValues ? formatCurrency(cumulativeBalance) : '*****'}
            </span>
            <div className="text-[10px] text-gray-500 mt-1 text-center">
              {user?.showValues && (
                <div>Meses anteriores</div>
              )}
            </div>
          </div>

          {/* SALDO TOTAL (SOMA DE TUDO) */}
          <div className={`p-2 rounded-3xl border flex flex-col items-center w-full ${
            totalBalance >= 0 
              ? `${colors.colors.success.bg} ${colors.colors.success.border}`
              : `${colors.colors.error.bg} ${colors.colors.error.border}`
          }`}>
            <span className={`text-xs font-medium ${colors.text.secondary}`}>Saldo Total</span>
            <span className={`text-xs font-bold ${
              totalBalance >= 0
                ? `${colors.colors.success.text}` 
                : `${colors.colors.error.text}`
            }`}>
              {user?.showValues ? formatCurrency(totalBalance) : '*****'}
            </span>
            <div className="text-[10px] text-gray-500 mt-1 text-center">
              {user?.showValues && (
                <div>Acumulado + Este mês</div>
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
          
          <div className={`${colors.colors.info.bg} pl-3 py-1 flex flex-col`}>
            <span className={`text-[10px] ${colors.colors.info.text} font-medium`}>Acumulado</span>
            <span className={`text-xs font-bold ${colors.colors.info.text}`}>
              {user?.showValues ? formatCurrency(cumulativeBalance) : '***'}
            </span>
          </div>
          
          <div className={`flex flex-col rounded-e-xl pl-3 py-1 ${
            totalBalance >= 0 
              ? `${colors.colors.success.bg}` 
              : `${colors.colors.error.bg}`
          }`}>
            <span className={`text-[10px] font-medium ${colors.text.secondary}`}>Total</span>
            <span className={`text-xs font-bold ${
              totalBalance >= 0
                ? `${colors.colors.success.text}` 
                : `${colors.colors.error.text}`
            }`}>
              {user?.showValues ? formatCurrency(totalBalance) : '***'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
