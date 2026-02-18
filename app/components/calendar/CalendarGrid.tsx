"use client";

import { CalendarDay } from '@/app/types/calendar';
import { CalendarDaysSkeleton } from '@/app/components';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/utils';
import { useThemeColors } from '@/app/hook';
import { useMemo } from 'react';

interface CalendarGridProps {
  isLoading: boolean;
  calendarDays: CalendarDay[];
  onDayClick: (day: CalendarDay) => void;
}

export default function CalendarGrid({
  isLoading,
  calendarDays,
  onDayClick
}: CalendarGridProps) {

  const { user } = useAuth();
  const colors = useThemeColors();

  const numberOfWeeks = useMemo(() => {
    if (calendarDays.length === 0) return 5;

    const firstDay = calendarDays[0]?.date;
    if (!firstDay) return 5;

    const firstDayOfWeek = firstDay.getDay();
    const emptyCells = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const totalCells = emptyCells + calendarDays.length;

    return Math.ceil(totalCells / 7);
  }, [calendarDays]);

  if (isLoading) return <CalendarDaysSkeleton />;

  const renderEmptyCells = () => {
    if (!calendarDays.length) return null;

    const firstDay = calendarDays[0]?.date;
    if (!firstDay) return null;

    const firstDayOfWeek = firstDay.getDay();
    const emptyCells = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    return Array.from({ length: emptyCells }).map((_, i) => (
      <div key={`empty-${i}`} className="aspect-square" />
    ));
  };

  return (
    <div
      className="
        grid grid-cols-7
        gap-0 sm:gap-3
        p-0 sm:p-6
      "
      style={{
        gridTemplateRows: `repeat(${numberOfWeeks}, minmax(70px, 1fr))`
      }}
    >
      {renderEmptyCells()}

      {calendarDays.map((day, index) => {
        const income = day.income || 0;
        const expenses = day.expenses || 0;
        const balance = income - expenses;
        const hasTransactions = (day.transactions?.length || 0) > 0;

        return (
          <div
            key={index}
            onClick={() => onDayClick(day)}
            className={`
              relative flex flex-col
              rounded-none sm:rounded-2xl
              p-1 sm:p-3
              transition-all duration-300
              cursor-pointer
              border
              ${
                day.isToday
                  ? "bg-purple-600/15 border-purple-500/40 shadow-md"
                  : "bg-white/10 dark:bg-slate-800/40 border-white/5 dark:border-slate-800"
              }
            `}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between">
              <span
                className={`
                  text-xs sm:text-sm font-semibold
                  ${
                    day.isToday
                      ? "text-purple-400"
                      : "text-slate-700 dark:text-slate-200"
                  }
                `}
              >
                {day.date?.getDate()}
              </span>

              {hasTransactions && (
                <span className="
                  w-1.5 h-1.5 rounded-full
                  bg-gradient-to-r from-purple-500 to-indigo-500
                " />
              )}
            </div>

            {/* MOBILE: saldo compacto */}
            {/*<div className="block sm:hidden mt-auto text-right">
              <span
                className={`
                  text-[7.5px] sm:text-xs
                  ${
                    balance >= 0
                      ? colors.colors.success.text
                      : colors.colors.error.text
                  }
                `}
              >
                {(income !== 0 || expenses !== 0) &&
                  (user?.showValues
                    ? formatCurrency(balance)
                    : "•••")
                }
              </span>
            </div>*/}

            {/* DESKTOP EXTRA INFO */}
            <div className="mt-auto text-[7.5px] sm:text-xs text-right space-y-0.5">
              {income > 0 && (
                <div className={colors.colors.income.text}>
                  {user?.showValues ? formatCurrency(income) : "•••"}
                </div>
              )}
              {expenses > 0 && (
                <div className={colors.colors.expense.text}>
                  {user?.showValues ? formatCurrency(expenses) : "•••"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
