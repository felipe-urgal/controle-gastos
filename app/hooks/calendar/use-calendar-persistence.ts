// app/hook/useCalendarPersistence.ts
"use client"

import { useEffect, useRef, useCallback } from "react";

const KEY = "calendar-selected-month";

export function useCalendarPersistence(
  currentDate: Date,
  goToDate: (date: Date) => void
) {
  const initialLoadRef = useRef(true);

  const stableGoToDate = useCallback(
    (date: Date) => goToDate(date),
    [goToDate]
  );

  useEffect(() => {
    if (!initialLoadRef.current) return;

    const saved = localStorage.getItem(KEY);
    if (!saved) return;

    initialLoadRef.current = false;

    const savedDate = new Date(saved);
    if (!isNaN(savedDate.getTime())) {
      stableGoToDate(savedDate);
    }
  }, [stableGoToDate]);

  useEffect(() => {
    localStorage.setItem(KEY, currentDate.toISOString());
  }, [currentDate]);
};
