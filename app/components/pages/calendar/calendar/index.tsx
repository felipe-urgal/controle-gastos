'use client';

import { useCallback } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { PageHeader } from '@/app/components/base-pages';
import { ProtectedRoute } from '@/app/components/layout';
import {
  CalendarGrid,
  CalendarHeader,
  DayModal,
  MonthlySummary,
  WeekDaysHeader,
} from '@/app/components/pages/calendar';
import { Button } from '@/app/components/ui';
import { useCalendar } from '@/app/hooks/calendar/use-calendar';
import { useCalendarModal } from '@/app/hooks/calendar/use-calendar-modal';
import { useCalendarPersistence } from '@/app/hooks/calendar/use-calendar-persistence';
import { monthNames } from '@/app/lib/date/constants';

export default function Calendar() {
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
    fetchMonthTransactions,
    refreshAccounts,
  } = useCalendar();

  useCalendarPersistence(currentDate, goToDate);

  const refetchTransactions = useCallback(async () => {
    await fetchMonthTransactions(currentDate, selectedAccount);
    await refreshAccounts();
  }, [
    currentDate,
    selectedAccount,
    fetchMonthTransactions,
    refreshAccounts,
  ]);

  const {
    selectedDate,
    isModalOpen,
    handleDayClick,
    closeModal,
    dayTransactions,
  } = useCalendarModal(calendarDays, goToDate);

  const monthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <ProtectedRoute>
      <PageHeader
        title="Calendário"
        description="Acompanhe receitas, despesas e lançamentos por dia sem alterar as transações ao navegar entre meses."
      />

      <CalendarHeader
        isLoading={isLoading}
        selectedAccount={selectedAccount}
        accounts={accounts}
        onGoToToday={goToToday}
        onAccountChange={handleAccountChange}
      />

      <section className="ds-panel overflow-hidden" aria-labelledby="calendar-month-heading">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-3 sm:px-5 sm:py-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<FaChevronLeft />}
            onClick={goToPreviousMonth}
            disabled={isLoading}
            aria-label="Mês anterior"
          />

          <div className="min-w-0 text-center">
            <p className="text-sm font-medium text-[var(--text-muted)]">Visão mensal</p>
            <h2
              id="calendar-month-heading"
              className="mt-0.5 truncate text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl"
            >
              {monthLabel}
            </h2>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<FaChevronRight />}
            onClick={goToNextMonth}
            disabled={isLoading}
            aria-label="Próximo mês"
          />
        </div>

        <MonthlySummary isLoading={isLoading} additionalData={additionalData} />
        <WeekDaysHeader />
        <CalendarGrid
          isLoading={isLoading}
          calendarDays={calendarDays}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
        />
      </section>

      <DayModal
        isOpen={isModalOpen}
        onClose={closeModal}
        selectedDate={selectedDate ?? undefined}
        transactions={dayTransactions}
        isLoading={false}
        onRefreshCalendar={refetchTransactions}
      />
    </ProtectedRoute>
  );
}
