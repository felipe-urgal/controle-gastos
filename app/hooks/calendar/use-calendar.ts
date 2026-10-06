"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readPersistedCalendarMonth } from "@/app/hooks/calendar/use-calendar-persistence";
import { accountService } from "@/app/services/account-service";
import { calendarService } from "@/app/services/calendar-service";
import type { AccountModel } from "@/app/types/account";
import type {
  CalendarDate,
  CalendarDay,
  CalendarEvent,
  CalendarReadModel,
} from "@/app/types/calendar";
import type { CurrencyFinancialSummary } from "@/app/types/financial-summary";

function toCalendarDays(data: CalendarReadModel): CalendarDay[] {
  return data.days.map((day) => ({
    date: new Date(day.date.year, day.date.month - 1, day.date.day),
    isCurrentMonth: true,
    isToday:
      day.date.year === data.asOf.year &&
      day.date.month === data.asOf.month &&
      day.date.day === data.asOf.day,
    summaries: day.summaries,
    events: day.events,
  }));
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function previousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export const useCalendar = () => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [periodReady, setPeriodReady] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | "all">("all");
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [summary, setSummary] = useState<CurrencyFinancialSummary[]>([]);
  const [commitments, setCommitments] = useState<CalendarEvent[]>([]);
  const [commitmentCount, setCommitmentCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [asOf, setAsOf] = useState<CalendarDate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  const [accountsError, setAccountsError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const persisted = readPersistedCalendarMonth();
      if (persisted) {
        setCurrentDate(persisted);
      }
      setPeriodReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAccounts() {
      setAccountsError("");
      try {
        const response = await accountService.getAll();
        if (!active) return;
        setAccounts(response.data.items ?? []);
      } catch (error) {
        if (!active) return;
        setAccounts([]);
        setAccountsError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as contas.",
        );
      }
    }

    void loadAccounts();
    return () => {
      active = false;
    };
  }, [retryVersion]);

  useEffect(() => {
    if (!periodReady) return;

    const sequence = ++requestSequence.current;
    const controller = new AbortController();

    async function loadCalendar() {
      setIsLoading(true);
      setCalendarError("");
      setCalendarDays([]);
      setSummary([]);
      setCommitments([]);
      setCommitmentCount(0);
      setOverdueCount(0);

      try {
        const response = await calendarService.get(
          {
            year: currentDate.getFullYear(),
            month: currentDate.getMonth() + 1,
            accountId:
              selectedAccount === "all" ? undefined : selectedAccount,
          },
          controller.signal,
        );

        if (sequence !== requestSequence.current) return;
        setCalendarDays(toCalendarDays(response.data));
        setSummary(response.data.summary);
        setCommitments(response.data.commitments);
        setCommitmentCount(response.data.commitmentCount);
        setOverdueCount(response.data.overdueCount);
        setAsOf(response.data.asOf);
      } catch (error) {
        if (isAbortError(error) || sequence !== requestSequence.current) return;
        setCalendarError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o calendário.",
        );
      } finally {
        if (sequence === requestSequence.current) {
          setIsLoading(false);
        }
      }
    }

    void loadCalendar();

    return () => {
      controller.abort();
    };
  }, [currentDate, periodReady, retryVersion, selectedAccount]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((value) => previousMonth(value));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate((value) => nextMonth(value));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }, []);

  const handleAccountChange = useCallback((accountId: string | number) => {
    setSelectedAccount(String(accountId) as string | "all");
  }, []);

  const retry = useCallback(() => {
    setRetryVersion((value) => value + 1);
  }, []);

  return {
    currentDate,
    periodReady,
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    summary,
    commitments,
    commitmentCount,
    overdueCount,
    asOf,
    error: calendarError || accountsError,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    handleAccountChange,
    retry,
  };
};
