"use client";

// importing hooks
import { useMemo } from 'react';

// importing types
import { CalendarDay } from '@/app/types/calendar';

// importing components
import { CalendarDaysSkeleton } from '@/app/components/calendar';

// importing utils
import { formatCurrency } from "@/app/lib/currency/formatCurrency";

interface CalendarGridProps {
  isLoading: boolean;
  calendarDays: CalendarDay[];
  onDayClick: (day: CalendarDay) => void;
}

export default function CalendarGrid({ isLoading, calendarDays, onDayClick }: CalendarGridProps) {
  const numberOfWeeks = useMemo(() => {
    if (calendarDays.length === 0) return 5;

    const firstDay = calendarDays[0]?.date;
    if (!firstDay) return 5;

    const emptyCells = firstDay.getDay();
    const totalCells = emptyCells + calendarDays.length;

    return Math.ceil(totalCells / 7);
  }, [calendarDays]);

  if (isLoading) return <CalendarDaysSkeleton />;

  const renderEmptyCells = () => {
    if (!calendarDays.length) return null;

    const firstDay = calendarDays[0]?.date;
    if (!firstDay) return null;

    const emptyCells = firstDay.getDay();

    return Array.from({ length: emptyCells }).map((_, i) => (
      <div key={`empty-${i}`} className="aspect-square" />
    ));
  };

  return (
    <div
      className="grid grid-cols-7 gap-0 sm:gap-3 p-0 sm:py-6"
      style={{ gridTemplateRows: `repeat(${numberOfWeeks}, minmax(100px, 1fr))`}}
    >
      {renderEmptyCells()}

      {calendarDays.map((day, index) => {
        const income = day.income || 0;
        const expenses = day.expenses || 0;
        const hasTransactions = (day.transactions?.length || 0) > 0;

        return (
          <div
            key={index}
            onClick={() => onDayClick(day)}
            className={`relative flex flex-col justify-between rounded-none sm:rounded-2xl p-[5px] sm:p-4 transition-all duration-300 cursor-pointer border-[.5]
              hover:shadow-purple-500/30 hover:scale-[1.03] hover:border-purple-500/40 hover:text-purple-400 text-slate-200 hover:bg-purple-600/15
              ${day.isToday ? "bg-purple-600/15 border-purple-500/40 shadow-md" : "bg-white/10 dark:bg-slate-800 border-white/5 dark:border-slate-600"}
            `}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm sm:text-lg font-semibold ${day.isToday ? "text-purple-400" : ""}`}>
                {day.date?.getDate()}
              </span>

              {hasTransactions && (
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
              )}
            </div>

            <div className="text-[8px] font-medium sm:text-xs text-start">
              {income > 0 && (
                <div className="text-green-300">
                  {formatCurrency(income)}
                </div>
              )}
              {expenses > 0 && (
                <div className="text-red-300">
                  {formatCurrency(expenses)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
