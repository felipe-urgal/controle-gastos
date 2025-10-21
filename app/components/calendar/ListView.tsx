// app/components/ListView.tsx
"use client";

import { CalendarDay } from '@/app/types/calendar';

import { useAuth } from '@/app/context';

import { formatCurrency, formatDate } from '@/app/utils';

import { useThemeColors } from '@/app/hook';

import { ListViewSkeleton } from '@/app/components'

interface ListViewProps {
  calendarDays: CalendarDay[];
  onDayClick: (day: CalendarDay) => void;
  isLoading: boolean;
}

export default function ListView({ calendarDays, onDayClick, isLoading }: ListViewProps) {
  const { user } = useAuth();
  const colors = useThemeColors();

  // Filtrar apenas dias com transações
  const daysWithTransactions = calendarDays

  if (isLoading) {
    return <ListViewSkeleton />;
  }

  return (
    <div className={`flex-1 overflow-y-auto ${colors.bg.primary}`}>
      <div className="p-4 space-y-3">
        {daysWithTransactions.map((day, index) => (
          <div
            key={index}
            onClick={() => onDayClick(day)}
            className={`
              p-4 rounded-xl border cursor-pointer transition-all duration-200
              ${colors.border.primary} ${colors.bg.modal}
              hover:${colors.state.hover} active:scale-95
              shadow-sm hover:shadow-md
            `}
          >
            {/* Cabeçalho do dia */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${day.isToday 
                    ? `${colors.button.primary.bg} ${colors.button.primary.text}` 
                    : `${colors.bg.secondary} ${colors.text.secondary}`
                  }
                `}>
                  {day.date?.getDate()}
                </div>
                <div>
                  <p className={`font-medium ${colors.text.primary}`}>
                    {day.date && formatDate(day.date, 'EEEE')}
                  </p>
                  <p className={`text-sm ${colors.text.tertiary}`}>
                    {day.date && formatDate(day.date, 'dd/MM')}
                  </p>
                </div>
              </div>
              
              {/* Saldo do dia */}
              <div className="text-right">
                <p className={`text-sm font-medium ${colors.text.tertiary}`}>
                  Saldo do dia
                </p>
                <p className={`text-lg font-bold ${
                  (day.income || 0) - (day.expenses || 0) >= 0 
                    ? colors.colors.success.text 
                    : colors.colors.error.text
                }`}>
                  {user?.showValues 
                    ? formatCurrency(((day.income || 0) - (day.expenses || 0)))
                    : '***'
                  }
                </p>
              </div>
            </div>

            {/* Transações */}
            <div className="space-y-2">
              {day.transactions?.map((transaction, transIndex) => {
                const amount = typeof transaction.amount === 'number' 
                  ? transaction.amount 
                  : Number(transaction.amount) || 0;

                return (
                  <div key={transIndex} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`
                        w-2 h-2 rounded-full flex-shrink-0
                        ${transaction.type === 'INCOME' 
                          ? colors.colors.income.bg 
                          : colors.colors.expense.bg
                        }
                      `} />
                      <p className={`text-sm truncate ${colors.text.primary}`}>
                        {transaction.description || 'Sem descrição'}
                      </p>
                    </div>
                    <p className={`
                      text-sm font-medium flex-shrink-0 ml-2
                      ${transaction.type === 'INCOME' 
                        ? colors.colors.income.text 
                        : colors.colors.expense.text
                      }
                    `}>
                      {user?.showValues 
                        ? formatCurrency(amount / 100)
                        : '***'
                      }
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}