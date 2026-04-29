"use client";

// importing hooks
import { useCallback } from "react";
import { useCalendar } from "@/app/hooks/calendar/use-calendar";
import { useCalendarModal } from "@/app/hooks/calendar/use-calendar-modal";
import { useCalendarPersistence } from "@/app/hooks/calendar/use-calendar-persistence";

// importing components
import { CalendarGrid, CalendarHeader, DayModal, MonthlySummary, WeekDaysHeader } from "@/app/components/pages/calendar";
import { ProtectedRoute } from "@/app/components/layout";
import { Button } from "@/app/components/ui";

// importing utils
import { monthNames } from "@/app/lib/date/constants";

// importing icons
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

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

  const {
    selectedDate,
    isModalOpen,
    handleDayClick,
    closeModal,
    dayTransactions,
  } = useCalendarModal(calendarDays, goToDate);

  return (
    <ProtectedRoute>
      <div className="relative overflow-hidden">

        <div className="relative mx-auto">
          <div className="overflow-hidden flex flex-col">
            <CalendarHeader
              isLoading={isLoading}
              selectedAccount={selectedAccount}
              accounts={accounts}
              onGoToToday={goToToday}
              onAccountChange={handleAccountChange}
            />

            <div className="mt-3 rounded-t-xl backdrop-blur-sm border bg-white/5 border-white/10">
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center justify-between w-full">
                  <Button
                    variant="ghost"
                    onClick={goToPreviousMonth}
                    className="p-2 rounded-lg hover:bg-white/10 transition"
                    disabled={isLoading}
                  >
                    <FaChevronLeft className="w-5 h-5" />
                  </Button>

                  <h2
                    className={`${isLoading ? "pointer-events-none opacity-50" : ""} text-lg sm:text-2xl font-semibold tracking-tight text-center flex-1`}>
                    {monthNames[currentDate.getMonth()]}{" "}
                    {currentDate.getFullYear()}
                  </h2>

                  <Button
                    variant="ghost"
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg hover:bg-white/10 transition"
                    disabled={isLoading}
                  >
                    <FaChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <MonthlySummary
                isLoading={isLoading}
                additionalData={additionalData}
              />

              <WeekDaysHeader />

              <div className="flex-1 overflow-auto min-h-0 smooth-scroll">
                <CalendarGrid
                  isLoading={isLoading}
                  calendarDays={calendarDays}
                  onDayClick={handleDayClick}
                />
              </div>
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
    </ProtectedRoute>
  );
};
