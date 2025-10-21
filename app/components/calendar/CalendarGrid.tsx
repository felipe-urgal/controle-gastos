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

  // Calcular o número de semanas no mês atual
  const numberOfWeeks = useMemo(() => {
    if (calendarDays.length === 0) return 5; // valor padrão
    
    const firstDay = calendarDays[0]?.date;
    const lastDay = calendarDays[calendarDays.length - 1]?.date;
    
    if (!firstDay || !lastDay) return 5;
    
    // Calcular semanas baseado nos dias e células vazias
    const firstDayOfWeek = firstDay.getDay();
    const emptyCellsCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const totalCells = emptyCellsCount + calendarDays.length;
    return Math.ceil(totalCells / 7);
  }, [calendarDays]);

  // Altura dinâmica baseada no número de semanas - funciona para mobile e desktop
  const gridStyle = useMemo(() => {
    // Para mobile: altura fixa baseada no número de semanas
    // Para desktop: altura flexível
    const mobileHeight = `min-h-[${numberOfWeeks * 100}px]`; // Aprox 80px por linha no mobile
    const desktopHeight = 'lg:h-full';
    
    return `${mobileHeight} ${desktopHeight}`;
  }, [numberOfWeeks]);

  // Altura individual dos dias baseada no número de semanas
  const dayStyle = useMemo(() => {
    // Para mobile: altura fixa
    // Para desktop: altura flexível usando min-height
    const mobileHeight = 'min-h-[115px]'; // Altura mínima para mobile
    const desktopHeight = 'lg:min-h-[100px]'; // Altura mínima maior para desktop
    
    return `${mobileHeight} ${desktopHeight}`;
  }, []);

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
        className={`${colors.border.primary} ${colors.calendar.day.bg} ${colors.calendar.day.text} ${dayStyle}`}
      />
    ));
  };

  return (
    <div 
      className={`
        grid grid-cols-7 gap-px 
        ${resolvedTheme === 'dark' ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-200'} 
        w-full border-b
        ${gridStyle}
      `}
      style={{
        // CSS customizado para garantir altura dinâmica
        gridTemplateRows: `repeat(${numberOfWeeks}, minmax(0, 1fr))`
      }}
    >
      {/* Células vazias para alinhar o primeiro dia do mês */}
      {renderEmptyCells()}
      
      {/* Dias do mês atual */}
      {calendarDays.map((day, index) => (
        <div
          key={index}
          className={`
            ${dayStyle} p-2 cursor-pointer transition-all duration-200 
            ${colors.border.primary} relative w-full
            ${day.isToday 
              ? 'bg-blue-500/40' 
              : `${day.isCurrentMonth 
                ? `${colors.calendar.day.text} ${colors.calendar.day.bg}`
                : `${colors.text.tertiary} ${colors.calendar.day.bgOther}`
              }`}
            flex flex-col items-center justify-start
            /* Garantir que o conteúdo ocupe toda a célula */
            h-full
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
          <div className="space-y-1 w-full flex-1 flex flex-col justify-center min-h-0">
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