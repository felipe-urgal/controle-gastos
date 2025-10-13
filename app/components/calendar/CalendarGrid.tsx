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

    // Obter o dia da semana do primeiro dia (0 = Domingo, 1 = Segunda, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // CORREÇÃO: Como nossa semana começa na segunda-feira (índice 0 = Segunda)
    // Precisamos mapear:
    // Domingo (0) → 6 células vazias
    // Segunda (1) → 0 células vazias  
    // Terça (2) → 1 célula vazia
    // Quarta (3) → 2 células vazias
    // Quinta (4) → 3 células vazias
    // Sexta (5) → 4 células vazias
    // Sábado (6) → 5 células vazias
    const emptyCellsCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    return Array.from({ length: emptyCellsCount }, (_, index) => (
      <div
        key={`empty-${index}`}
        className={`min-h-[11.2vh] p-1 ${colors.calendar.day.bgOther} ${colors.text.tertiary}`}
      />
    ));
  };

  return (
    <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} w-full h-full`}>
      {/* Células vazias para alinhar o primeiro dia do mês */}
      {renderEmptyCells()}
      
      {/* Dias do mês atual */}
      {calendarDays.map((day, index) => (
        <div
          key={index}
          className={`
            min-h-[11.2vh] p-1 cursor-pointer transition-all duration-200 border-0
            ${colors.state.hover} ${colors.border.primary} relative w-full
            ${day.isCurrentMonth ? `${colors.calendar.day.text} ${colors.calendar.day.bg}` : `${colors.text.tertiary} ${colors.calendar.day.bgOther}`}
            ${day.isToday ? `${colors.calendar.day.bgToday} ${resolvedTheme === 'dark' ? 'border-blue-700' : 'border-blue-200'}` : ''}
            transform hover:scale-101 active:scale-95
            flex flex-col items-center justify-start
          `}
          onClick={() => onDayClick(day)}
        >
          {/* Número do dia */}
          <div className={`
            flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 mx-auto transition-all duration-200
            ${day.isToday ? `${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow}` : ''}
            ${!day.isCurrentMonth && day.isToday ? 'bg-blue-300' : ''}
          `}>
            {day.date?.getDate()}
          </div>
          
          {/* Resumo financeiro do dia */}
          <div className="space-y-0.5 w-full flex-1 flex flex-col justify-center">
            {(day?.income || 0) > 0 && (
              <div className={`text-[10px] ${colors.colors.income.text} font-medium truncate text-center leading-tight`}>
                {user?.showValues ? formatCurrency(day?.income || 0) : '*****'}
              </div>
            )}
            {(day?.expenses || 0) > 0 && (
              <div className={`text-[10px] ${colors.colors.expense.text} font-medium truncate text-center leading-tight`}>
                {user?.showValues ? formatCurrency(day?.expenses || 0) : '*****'}
              </div>
            )}
            
            {(day?.transactions?.length || 0) > 0 && (
              <div className={`text-[9px] ${colors.text.tertiary} text-center truncate leading-tight`}>
                <span>
                  {day.transactions?.length || 0} transação{(day.transactions?.length || 0) !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
