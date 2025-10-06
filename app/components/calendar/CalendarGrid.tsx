"use client";

import { CalendarDay } from '@/app/types/calendar';
import { CalendarDaysSkeleton } from '@/app/components';
import { useAuth } from '@/app/context/AuthContext';
import { formatCurrency } from '@/app/utils/calendarUtils';
import { useThemeColors } from '@/app/hook/useThemeColors';

interface CalendarGridProps {
  isLoading: boolean;
  calendarDays: CalendarDay[];
  resolvedTheme: string;
  onDayClick: (day: CalendarDay) => void;
}

export default function CalendarGrid({
  isLoading,
  calendarDays,
  resolvedTheme,
  onDayClick
}: CalendarGridProps) {
  const { user } = useAuth();
  const colors = useThemeColors();

  if (isLoading) {
    return <CalendarDaysSkeleton />;
  }

  return (
    <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} w-full`}>
      {calendarDays.map((day, index) => (
        <div
          key={index}
          className={`
            min-h-[80px] sm:min-h-[120px] p-0 sm:p-2 cursor-pointer transition-all duration-200 border-0
            ${colors.state.hover} ${colors.border.primary} relative w-full
            ${day.isCurrentMonth ? `${colors.calendar.day.text} ${colors.calendar.day.bg}` : `${colors.text.tertiary} ${colors.calendar.day.bgOther}`}
            ${day.isToday ? `${colors.calendar.day.bgToday} ${resolvedTheme === 'dark' ? 'border-blue-700' : 'border-blue-200'}` : ''}
            transform hover:scale-105 active:scale-95
          `}
          onClick={() => onDayClick(day)}
        >
          <div className={`
            flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium mb-1 sm:mb-2 mx-auto transition-all duration-200
            ${day.isToday ? `${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow}` : ''}
            ${!day.isCurrentMonth && day.isToday ? 'bg-blue-300' : ''}
          `}>
            {day.date?.getDate()}
          </div>
          
          {/* Resumo financeiro do dia */}
          <div className="space-y-0 sm:space-y-1 w-full">
            {(day?.income || 0) > 0 && (
              <div className={`text-[7px] sm:text-xs ${colors.colors.income.text} font-medium truncate text-center`}>
                {user?.showValues ? formatCurrency(day?.income || 0) : '*****'}
              </div>
            )}
            {(day?.expenses || 0) > 0 && (
              <div className={`text-[7px] sm:text-xs ${colors.colors.expense.text} font-medium truncate text-center`}>
                {user?.showValues ? formatCurrency(day?.expenses || 0) : '*****'}
              </div>
            )}
            
            {(day?.transactions?.length || 0) > 0 && (
              <div className={`text-[7px] sm:text-xs ${colors.text.tertiary} mt-0.5 sm:mt-2 text-center truncate`}>
                <span className="">
                  {day.transactions?.length || 0} transação{(day.transactions?.length || 0) !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};