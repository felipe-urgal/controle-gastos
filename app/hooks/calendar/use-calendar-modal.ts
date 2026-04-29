// app/hook/useCalendarModal.ts
"use client"

import { useState, useMemo, useCallback } from "react";
import { CalendarDay } from "@/app/types/calendar";

export function useCalendarModal(
  calendarDays: CalendarDay[],
  goToDate: (date: Date) => void
) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getDayTransactions = useCallback(
    (date: Date) => {
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);

      const found = calendarDays.find((day) => {
        if (!day.date) return false;
        const d = new Date(day.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === target.getTime();
      });

      return found?.transactions || [];
    },
    [calendarDays]
  );

  const handleDayClick = (day: CalendarDay) => {
    const safeDate = day.date || new Date();
    setSelectedDate(safeDate);

    if (!day.isCurrentMonth) {
      goToDate(safeDate);
      setTimeout(() => setIsModalOpen(true), 100);
      return;
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const dayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return getDayTransactions(selectedDate);
  }, [selectedDate, getDayTransactions]);

  return {
    selectedDate,
    isModalOpen,
    handleDayClick,
    closeModal,
    dayTransactions,
  };
};
