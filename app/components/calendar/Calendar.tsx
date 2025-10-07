"use client";

import { Suspense, useState } from 'react';

// Hooks
import { useCalendar } from '@/app/hook/useCalendar';
import { useThemeColors } from '@/app/hook/useThemeColors';

// Context
import { useTheme } from "@/app/context/ThemeContext";
import { useAuth } from '@/app/context/AuthContext';

// Components
import { DayModal, CalendarGrid, WeekDaysHeader, CalendarHeader, MonthlySummary, MonthlySummarySkeleton, CalendarDaysSkeleton } from '@/app/components';

// Types
import { CalendarDay } from '@/app/types/calendar';

// Services
import { transactionService } from '@/app/services/transactionService';

export default function Calendar() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const colors = useThemeColors();
  
  // Estados locais para o modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTransactions, setDayTransactions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [dayInvestments, setDayInvestments] = useState<any[]>([]);

  // Hook do calendário
  const {
    currentDate,
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    cumulativeBalance,
    additionalData,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    handleAccountChange,
    fetchMonthTransactions
  } = useCalendar();

  // Função para buscar transações do dia
  const fetchDayTransactions = async (date: Date, accountId: string | 'all' = 'all') => {
    if(!user) return;
    
    setIsModalLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      // Usando o transactionService
      const response = await transactionService.getTransactions(user.id, {
        year: year.toString(),
        month: month.toString(),
        limit: "1000",
        account: accountId !== 'all' ? accountId : undefined
      });

      // Filtrar transações pelo dia específico
      const dayTransactions = response.data.items.filter((transaction: any) => {
        return transaction.year === year && 
               transaction.month === month && 
               transaction.day === day;
      });
      
      setDayTransactions(dayTransactions);
      
    } catch (error) {
      console.error('Erro ao buscar transações do dia:', error);
    } finally {
      setIsModalLoading(false);
    }
  };

  // Handler para clique no dia
  const handleDayClick = async (day: CalendarDay) => {
    const safeDate = day.date || new Date();
    setSelectedDate(safeDate);
    
    if (!day.isCurrentMonth) {
      goToDate(safeDate);
      // Wait a bit for the calendar to update before opening modal
      setTimeout(() => {
        setIsModalOpen(true);
        fetchDayTransactions(safeDate, selectedAccount);
      }, 100);
      return;
    }
    
    setIsModalOpen(true);
    await fetchDayTransactions(safeDate, selectedAccount);
  };

  // Handler para mudanças nas transações
  const handleTransactionsChange = () => {
    if (selectedDate) {
      fetchDayTransactions(selectedDate, selectedAccount);
      fetchMonthTransactions(currentDate, selectedAccount);
    }
  };

  // Fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setDayTransactions([]);
    setDayInvestments([]);
  };

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
      <div 
        className={`fixed w-full h-full ${colors.bg.overlay} flex items-center justify-center z-50 animate-fade-in`}
      >
        <div className={`
          ${colors.bg.modal} rounded-none sm:rounded-3xl shadow-xl w-full h-full 
          sm:max-w-100vw sm:max-h-100vh sm:mx-4 overflow-hidden flex flex-col 
          animate-slide-up-mobile sm:animate-slide-up justify-center
        `}>
          {/* Calendário Principal (com swipe) */}
          <div>
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
              cumulativeBalance={cumulativeBalance}
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
        </div>

        {/* Modal de transações do dia */}
        <DayModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedDate={selectedDate}
          transactions={dayTransactions}
          investments={dayInvestments}
          isLoading={isModalLoading}
          onTransactionsChange={handleTransactionsChange}
        />
      </div>
    </Suspense>
  );
}