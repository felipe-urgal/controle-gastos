"use client";

import { generateCalendarDays } from '@/app/utils/calendarUtils';
import { monthNames } from '@/app/utils/calendarUtils';
import { useThemeColors } from '@/app/hook/useThemeColors';

interface NeighborCalendarsProps {
  neighborMonths: {
    previous: Date;
    next: Date;
  };
  swipeOffset: number;
  resolvedTheme: string;
}

export default function NeighborCalendars({
  neighborMonths,
  swipeOffset,
  resolvedTheme
}: NeighborCalendarsProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Calendário do Mês Anterior (escondido à esquerda) */}
      <div className={`absolute inset-0 transition-opacity duration-300 z-0 ${
        swipeOffset < 0 ? 'opacity-70' : 'opacity-0'
      }`}>
        <div className={`${colors.calendar.bg} rounded-3xl shadow-3xl w-full h-full`} 
              style={{ transform: `translateX(${100 + swipeOffset * 0.5}%)` }}>
          {/* Header do mês anterior */}
          <div className={`px-3 pt-1 sm:pt-0 sm:px-4 border-b ${colors.border.primary}`}>
            <div className={`flex items-center justify-between mb-4 pb-2 sm:mb-0 border-b ${colors.border.primary}`}>
              <h2 className={`text-lg sm:text-2xl font-bold ${colors.text.tertiary}`}>
                {monthNames[neighborMonths.previous.getMonth()]} {neighborMonths.previous.getFullYear()}
              </h2>
            </div>
          </div>
          {/* Grid simplificado do mês anterior */}
          <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
            {generateCalendarDays(neighborMonths.previous).map((day, index) => (
              <div key={index} className={`min-h-[60px] p-1 ${colors.calendar.day.bg}`}>
                <div className={`text-center text-xs ${
                  day.isCurrentMonth ? colors.text.tertiary : colors.text.tertiary
                }`}>
                  {day.date?.getDate() || '?'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendário do Próximo Mês (escondido à direita) */}
      <div className={`absolute inset-0 transition-opacity duration-300 z-0 ${
        swipeOffset > 0 ? 'opacity-70' : 'opacity-0'
      }`}>
        <div className={`${colors.calendar.bg} rounded-3xl shadow-3xl w-full h-full`}
              style={{ transform: `translateX(${-100 + swipeOffset * 0.5}%)` }}>
          {/* Header do próximo mês */}
          <div className={`px-3 pt-1 sm:pt-0 sm:px-4 border-b ${colors.border.primary}`}>
            <div className={`flex items-center justify-between mb-4 pb-2 sm:mb-0 border-b ${colors.border.primary}`}>
              <h2 className={`text-lg sm:text-2xl font-bold ${colors.text.tertiary}`}>
                {monthNames[neighborMonths.next.getMonth()]} {neighborMonths.next.getFullYear()}
              </h2>
            </div>
          </div>
          {/* Grid simplificado do próximo mês */}
          <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
            {generateCalendarDays(neighborMonths.next).map((day, index) => (
              <div key={index} className={`min-h-[60px] p-1 ${colors.calendar.day.bg}`}>
                <div className={`text-center text-xs ${
                  day.isCurrentMonth ? colors.text.tertiary : colors.text.tertiary
                }`}>
                  {day.date?.getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};