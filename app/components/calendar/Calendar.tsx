"use client";

import { useCallback } from "react";
import { useCalendar, useCalendarPersistence, useCalendarRealtime, useCalendarModal } from "@/app/hook";

import {
  CalendarHeader,
  MonthlySummary,
  WeekDaysHeader,
  CalendarGrid,
  DayModal,
} from "@/app/components";

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

  const refetchTransactions = useCallback(() => {
    fetchMonthTransactions(currentDate, selectedAccount);
    refreshAccounts();
  }, [
    currentDate,
    selectedAccount,
    fetchMonthTransactions,
    refreshAccounts,
  ]);

  useCalendarRealtime(refetchTransactions);

  const {
    selectedDate,
    isModalOpen,
    handleDayClick,
    closeModal,
    dayTransactions,
  } = useCalendarModal(calendarDays, goToDate);

  return (
    <div className="relative overflow-hidden">

      <div className="relative mx-auto">

        <div className="
          overflow-hidden
          flex flex-col
        ">
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

          <MonthlySummary
            isLoading={isLoading}
            additionalData={additionalData}
          />

          <WeekDaysHeader />

          <div
            className="flex-1 overflow-auto min-h-0 smooth-scroll"
          >
            <CalendarGrid
              isLoading={isLoading}
              calendarDays={calendarDays}
              onDayClick={handleDayClick}
            />
          </div>
        </div>
      </div>

      <DayModal
        isOpen={isModalOpen}
        onClose={closeModal}
        selectedDate={selectedDate}
        transactions={dayTransactions}
        isLoading={false}
      />
    </div>
  );
}
