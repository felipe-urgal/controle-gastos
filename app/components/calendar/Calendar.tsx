"use client";

import { Suspense, useState, useMemo, useCallback } from 'react';

// Hooks
import { useCalendar } from '@/app/hook/useCalendar';
import { useThemeColors } from '@/app/hook/useThemeColors';

// Context
import { useTheme } from "@/app/context/ThemeContext";

// Components
import { DayModal, CalendarGrid, WeekDaysHeader, CalendarHeader, MonthlySummary, MonthlySummarySkeleton, CalendarDaysSkeleton } from '@/app/components';

// Types
import { CalendarDay } from '@/app/types/calendar';

export default function Calendar() {
  const { resolvedTheme } = useTheme();
  const colors = useThemeColors();
  
  // Estados locais para o modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dayInvestments, setDayInvestments] = useState<any[]>([]);

  // Hook do calendário
  const {
    currentDate,
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    additionalData,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    handleAccountChange,
    fetchMonthTransactions
  } = useCalendar();

  // CORREÇÃO: Usar useCallback para a função
  const getDayTransactions = useCallback((date: Date): any[] => {
    if (!date) return [];
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const dayData = calendarDays.find(day => {
      if (!day.date) return false;
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === targetDate.getTime();
    });
    
    return dayData?.transactions || [];
  }, [calendarDays]);

  // Handler para clique no dia - AGORA SEM CHAMADA API
  const handleDayClick = async (day: CalendarDay) => {
    const safeDate = day.date || new Date();
    setSelectedDate(safeDate);
    
    if (!day.isCurrentMonth) {
      goToDate(safeDate);
      // Aguardar um pouco para o calendário atualizar antes de abrir o modal
      setTimeout(() => {
        setIsModalOpen(true);
      }, 100);
      return;
    }
    
    setIsModalOpen(true);
  };

  // Handler para mudanças nas transações
  const handleTransactionsChange = () => {
    if (selectedDate) {
      // Recarregar apenas os dados do mês, não do dia específico
      fetchMonthTransactions(currentDate, selectedAccount);
    }
  };

  // Fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setDayInvestments([]);
  };

  // Obter transações do dia selecionado a partir do calendarDays
  const dayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return getDayTransactions(selectedDate);
  }, [selectedDate, getDayTransactions]); // CORREÇÃO: Incluir getDayTransactions nas dependências

  return (
    <Suspense fallback={
      <div className={`${colors.calendar.bg} rounded-lg shadow-md w-full h-screen`}>
        <div className={`p-4 sm:p-6 border-b ${colors.border.primary}`}>
          <div className={`h-6 sm:h-8 ${colors.calendar.skeleton.bg} rounded w-48 sm:w-64 mb-4`}></div>
          <MonthlySummarySkeleton />
        </div>
        <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
          {[...Array(7)].map((_, index) => (
            <div key={index} className={`${colors.calendar.header.bg} p-2 sm:p-4 text-center`}>
              <div className={`h-3 sm:h-4 ${colors.calendar.skeleton.bg} rounded mx-auto w-3/4`}></div>
            </div>
          ))}
        </div>
        <CalendarDaysSkeleton />
      </div>
    }>
      {/* Container principal que ocupa toda a tela */}
      <div className={`fixed inset-0 ${colors.bg.overlay} flex items-end sm:items-center justify-center z-50 p-0 animate-fade-in safe-area-container`}
      >
        
        {/* Calendário Principal */}
        <div className={`
          ${colors.bg.modal} rounded-t-3xl sm:rounded-3xl shadow-xl w-full h-[95vh]
          sm:max-h-[90vh] overflow-hidden flex flex-col 
          animate-slide-up-mobile sm:animate-slide-up
          modal-fullscreen-mobile
        `}>
          {/* Header do Calendário */}
          <CalendarHeader
            isLoading={isLoading}
            currentDate={currentDate}
            selectedAccount={selectedAccount}
            accounts={accounts}
            onGoToPreviousMonth={goToPreviousMonth}
            onGoToNextMonth={goToNextMonth}
            onGoToToday={goToToday}
            onAccountChange={handleAccountChange}
          />

          {/* Resumo Mensal */}
          <MonthlySummary
            isLoading={isLoading}
            additionalData={additionalData}
          />

          {/* Dias da Semana */}
          <WeekDaysHeader resolvedTheme={resolvedTheme} />

          {/* Grid de Dias */}
          <CalendarGrid
            isLoading={isLoading}
            calendarDays={calendarDays}
            resolvedTheme={resolvedTheme}
            onDayClick={handleDayClick}
          />
        </div>

        {/* Modal de transações do dia */}
        <DayModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedDate={selectedDate}
          transactions={dayTransactions}
          investments={dayInvestments}
          isLoading={false} // Agora não precisa de loading pois os dados já estão carregados
          onTransactionsChange={handleTransactionsChange}
        />
      </div>
    </Suspense>
  );
}
