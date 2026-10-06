"use client";

import { useEffect } from "react";

const KEY = "calendar-selected-month";

function parseStoredMonth(value: string | null) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

export function readPersistedCalendarMonth() {
  if (typeof window === "undefined") return null;
  return parseStoredMonth(window.localStorage.getItem(KEY));
}

export function formatCalendarMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function useCalendarPersistence(currentDate: Date, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    window.localStorage.setItem(KEY, formatCalendarMonth(currentDate));
  }, [currentDate, enabled]);
}
