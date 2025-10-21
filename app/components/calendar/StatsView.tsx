// app/components/StatsView.tsx
"use client";

import { CalendarDay } from '@/app/types/calendar';

import { useAuth } from '@/app/context';

import { formatCurrency, formatDate } from '@/app/utils';

import { useThemeColors } from '@/app/hook';

import { StatsViewSkeleton } from '@/app/components'

interface StatsViewProps {
  calendarDays: CalendarDay[];
  onDayClick: (day: CalendarDay) => void;
  isLoading: boolean;
}

export default function StatsView({ calendarDays, onDayClick, isLoading }: StatsViewProps) {
  const { user } = useAuth();
  const colors = useThemeColors();

  // Calcular estatísticas
  const stats = calendarDays.reduce((acc, day) => {
    acc.totalIncome += day.income || 0;
    acc.totalExpenses += day.expenses || 0;
    acc.transactionCount += day.transactions?.length || 0;
    acc.daysWithTransactions += (day.transactions && day.transactions.length > 0) ? 1 : 0;
    return acc;
  }, {
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0,
    daysWithTransactions: 0
  });

  const balance = (stats.totalIncome - stats.totalExpenses);

  const StatCard = ({ title, value, subtitle, color }: any) => (
    <div className={`
      p-4 rounded-xl border ${colors.border.primary} ${colors.bg.modal}
      shadow-sm hover:shadow-md transition-shadow duration-200
    `}>
      <p className={`text-sm font-medium ${colors.text.secondary} mb-1`}>
        {title}
      </p>
      <p className={`text-2xl font-bold ${color} mb-1`}>
        {user?.showValues ? value : '***'}
      </p>
      {subtitle && (
        <p className={`text-xs ${colors.text.tertiary}`}>
          {subtitle}
        </p>
      )}
    </div>
  );

  if (isLoading) {
    return <StatsViewSkeleton />;
  }

  return (
    <div className={`flex-1 overflow-y-auto ${colors.bg.primary} p-4`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Saldo do Mês"
          value={formatCurrency(balance)}
          subtitle="Receitas - Despesas"
          color={balance >= 0 ? colors.colors.success.text : colors.colors.error.text}
        />
        
        <StatCard
          title="Total Receitas"
          value={formatCurrency(stats.totalIncome)}
          subtitle={`${stats.daysWithTransactions} dias com movimentação`}
          color={colors.colors.income.text}
        />
        
        <StatCard
          title="Total Despesas"
          value={formatCurrency(stats.totalExpenses)}
          subtitle={`${stats.transactionCount} transações no total`}
          color={colors.colors.expense.text}
        />
      </div>

      {/* Gráfico simples de barras para receitas/despesas por dia */}
      <div className={`
        p-4 rounded-xl border ${colors.border.primary} ${colors.bg.modal}
        shadow-sm
      `}>
        <h3 className={`text-lg font-semibold ${colors.text.primary} mb-4`}>
          Movimentação Diária
        </h3>
        
        <div className="space-y-3">
          {calendarDays
            .map((day, index) => {
              const total = (day.income || 0) + (day.expenses || 0);
              
              // CORREÇÃO: Evitar NaN nas porcentagens
              const incomePercent = total > 0 ? ((day.income || 0) / total) * 100 : 0;
              const expensePercent = total > 0 ? ((day.expenses || 0) / total) * 100 : 0;
              const hasMovement = total > 0;
              
              return (
                <div 
                  key={index}
                  onClick={() => onDayClick(day)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
                    ${colors.bg.modal} hover:${colors.state.hover} active:scale-95
                    border ${colors.border.primary}
                  `}
                >
                  <div className="w-12 text-right flex-shrink-0">
                    <div className="flex flex-col items-end">
                      <p className={`text-sm font-medium ${colors.text.primary}`}>
                        {day.date?.getDate()}
                      </p>
                      <p className={`text-xs ${colors.text.tertiary}`}>
                        {day.date && formatDate(day.date, 'EEE')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex h-6 rounded-full overflow-hidden">
                      {hasMovement ? (
                        <>
                          <div 
                            className={colors.colors.income.bg}
                            style={{ width: `${incomePercent}%` }}
                            title={`Receitas: ${formatCurrency((day.income || 0))}`}
                          />
                          <div 
                            className={colors.colors.expense.bg}
                            style={{ width: `${expensePercent}%` }}
                            title={`Despesas: ${formatCurrency((day.expenses || 0))}`}
                          />
                        </>
                      ) : (
                        <div 
                          className={`w-full ${colors.bg.secondary} opacity-50`}
                          title="Sem movimentação"
                        />
                      )}
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      {hasMovement ? (
                        <>
                          <span className={colors.colors.income.text}>
                            {user?.showValues ? formatCurrency(day.income || 0) : '***'}
                          </span>
                          <span className={colors.colors.expense.text}>
                            {user?.showValues ? formatCurrency(day.expenses || 0) : '***'}
                          </span>
                        </>
                      ) : (
                        <span className={`${colors.text.tertiary} mx-auto`}>
                          Sem movimentação
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-20 text-right flex-shrink-0">
                    <p className={`text-sm font-medium ${
                      hasMovement 
                        ? (day.income || 0) - (day.expenses || 0) >= 0 
                          ? colors.colors.success.text 
                          : colors.colors.error.text
                        : colors.text.tertiary
                    }`}>
                      {user?.showValues 
                        ? hasMovement 
                          ? formatCurrency((day.income || 0) - (day.expenses || 0))
                          : 'R$ 0,00'
                        : '***'
                      }
                    </p>
                    <p className={`text-xs ${colors.text.tertiary}`}>
                      Saldo
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}