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

  // Função para gerar células vazias no início do mês
  const renderEmptyCells = () => {
    if (calendarDays.length === 0) return null;
    
    const firstDay = calendarDays[0]?.date;
    if (!firstDay) return null;

    const firstDayOfWeek = firstDay.getDay();
    const emptyCellsCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    return Array.from({ length: emptyCellsCount }, (_, index) => (
      <div
        key={`empty-${index}`}
        className={`${colors.border.primary} ${colors.calendar.day.bgOther} ${colors.text.tertiary}`}
      />
    ));
  };

  return (
    <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-200'} w-full overflow-y-auto border-b`}>
      {/* Células vazias para alinhar o primeiro dia do mês */}
      {renderEmptyCells()}
      
      {/* Dias do mês atual */}
      {calendarDays.map((day, index) => (
        <div
          key={index}
          className={`
            h-25 p-2 cursor-pointer transition-all duration-200 ${colors.border.primary} relative w-full overflow-y-auto
            ${day.isToday 
              ? 'bg-blue-500/40' 
              : `${day.isCurrentMonth 
                ? `${colors.calendar.day.text} ${colors.calendar.day.bg}`
                : `${colors.text.tertiary} ${colors.calendar.day.bgOther}`
              }`}
            ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}
            flex flex-col items-center justify-start
          `}
          onClick={() => onDayClick(day)}
        >
          {/* Número do dia */}
          <div className={`
            flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mb-1 transition-all duration-200
            ${day.isToday ? `${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow}` : ''}
          `}>
            {day.date?.getDate()}
          </div>
          
          {/* Resumo financeiro do dia */}
          <div className="space-y-1 w-full flex-1 flex flex-col justify-center">
            {(day?.income || 0) > 0 && (
              <div className={`text-[8px] lg:text-xs ${colors.colors.income.text} font-medium truncate text-center leading-tight`}>
                {user?.showValues ? formatCurrency(day?.income || 0) : '*****'}
              </div>
            )}
            {(day?.expenses || 0) > 0 && (
              <div className={`text-[8px] lg:text-xs ${colors.colors.expense.text} font-medium truncate text-center leading-tight`}>
                {user?.showValues ? formatCurrency(day?.expenses || 0) : '*****'}
              </div>
            )}
            
            {(day?.transactions?.length || 0) > 0 && (
              <div className={`text-[8px] lg:text-xs ${colors.text.tertiary} text-center truncate leading-tight`}>
                {day.transactions?.length || 0} transação{(day.transactions?.length || 0) !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}