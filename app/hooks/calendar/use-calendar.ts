"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { todayLogicalDate } from "@/app/lib/date/logical-date";
import { accountService } from "@/app/services/account-service";
import { calendarService } from "@/app/services/calendar-service";
import type { AccountModel } from "@/app/types/account";
import type {
  CalendarDate,
  CalendarDay,
  CalendarEvent,
  CalendarInvestmentIncome,
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

/** Ao chegar num mês, seleciona o dia 1; no mês atual, seleciona hoje. */
function landingDate(year: number, monthIndex: number) {
  const logicalToday = todayLogicalDate();
  const today = new Date(logicalToday.year, logicalToday.month - 1, logicalToday.day);
  const first = new Date(year, monthIndex, 1);
  return first.getFullYear() === today.getFullYear() && first.getMonth() === today.getMonth() ? today : first;
}

function previousMonth(date: Date) {
  return landingDate(date.getFullYear(), date.getMonth() - 1);
}

function nextMonth(date: Date) {
  return landingDate(date.getFullYear(), date.getMonth() + 1);
}

export const useCalendar = () => {
  const [currentDate, setCurrentDate] = useState(() => {
    const today = todayLogicalDate();
    return new Date(today.year, today.month - 1, today.day);
  });
  const [selectedAccount, setSelectedAccount] = useState<string | "all">("all");
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [summary, setSummary] = useState<CurrencyFinancialSummary[]>([]);
  const [investmentIncome, setInvestmentIncome] = useState<CalendarInvestmentIncome[]>([]);
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

  // Só ano e mês pedem dados: ir para "hoje" ou outro dia do mesmo mês não deve recarregar nem esvaziar o calendário.
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    const sequence = ++requestSequence.current;
    const controller = new AbortController();

    async function loadCalendar() {
      setIsLoading(true);
      setCalendarError("");
      setCalendarDays([]);
      setSummary([]);
      setInvestmentIncome([]);
      setCommitments([]);
      setCommitmentCount(0);
      setOverdueCount(0);

      try {
        const response = await calendarService.get(
          {
            year,
            month,
            accountId:
              selectedAccount === "all" ? undefined : selectedAccount,
          },
          controller.signal,
        );

        if (sequence !== requestSequence.current) return;
        setCalendarDays(toCalendarDays(response.data));
        setSummary(response.data.summary);
        setInvestmentIncome(response.data.investmentIncome ?? []);
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
  }, [year, month, retryVersion, selectedAccount]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((value) => previousMonth(value));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate((value) => nextMonth(value));
  }, []);

  const goToToday = useCallback(() => {
    const today = todayLogicalDate();
    setCurrentDate(new Date(today.year, today.month - 1, today.day));
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
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    summary,
    investmentIncome,
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
