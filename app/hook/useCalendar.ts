"use client"

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context';
import { CalendarDay, Account } from '@/app/types/calendar';
import { transactionService } from '@/app/services/transactionService';
import { getPreviousMonth, getNextMonth, createDateKey } from '@/app/utils';

export const useCalendar = () => {
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAccount, setSelectedAccount] = useState<string | 'all'>('all');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [additionalData, setAdditionalData] = useState({
    income: "0",
    expenses: "0"
  });

  const hasFetchedAccounts = useRef(false);
  const isFetchingTransactions = useRef(false);

  const [neighborMonths, setNeighborMonths] = useState({
    previous: getPreviousMonth(currentDate),
    next: getNextMonth(currentDate)
  });

  useEffect(() => {
    setNeighborMonths({
      previous: getPreviousMonth(currentDate),
      next: getNextMonth(currentDate)
    });
  }, [currentDate]);

  const fetchUserAccounts = useCallback(async () => {
    if (!user || hasFetchedAccounts.current) return;
    
    try {
      hasFetchedAccounts.current = true;
      const response = await fetch(`/api/accounts`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAccounts(data.data.items || []);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      hasFetchedAccounts.current = false;
    }
  }, [user]);

  const createCalendarDay = useCallback((
    date: Date,
    isCurrentMonth: boolean,
    isToday: boolean,
    transactions: any[],
  ): CalendarDay => {
    const income = transactions
      .filter((t: any) => t.type === 'INCOME')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter((t: any) => t.type === 'EXPENSE')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    return {
      date,
      isCurrentMonth,
      isToday,
      income,
      expenses,
      transactions,
      investments: []
    };
  }, []);

  const processTransactionsByDay = useCallback((transactions: any[], currentDate: Date) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const today = new Date();

    const isTodayDate = (date: Date) => 
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const transactionsByDay: { [key: string]: any[] } = {};
    transactions.forEach((transaction: any) => {
      const transactionYear = transaction.year || year;
      const transactionMonth = transaction.month || month;
      const transactionDay = transaction.day || currentDate.getDate();
      const dateKey = createDateKey(transactionYear, transactionMonth, transactionDay);
      if (!transactionsByDay[dateKey]) transactionsByDay[dateKey] = [];
      transactionsByDay[dateKey].push(transaction);
    });

    const days: CalendarDay[] = [];

    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateKey = createDateKey(year, month, day);
      const dayTransactions = transactionsByDay[dateKey] || [];
      days.push(createCalendarDay(date, true, isTodayDate(date), dayTransactions));
    }

    setCalendarDays(days);
  }, [createCalendarDay]);

  const fetchMonthTransactions = useCallback(async (date: Date, accountId: string | 'all' = 'all') => {
    if (isFetchingTransactions.current) return;
    
    setIsLoading(true);
    isFetchingTransactions.current = true;
    
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (!user) {
        console.error('User ID não encontrado');
        return;
      }

      const response = await transactionService.getAll({
        year: year.toString(),
        month: month.toString(),
        accountId: accountId !== 'all' ? accountId : undefined
      });

      if (response.success) {
        processTransactionsByDay(response.data.items as any[], date);
      }

      // if (response.data.additionalData) {
      //   setAdditionalData(response.data.additionalData);
      // }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setIsLoading(false);
      isFetchingTransactions.current = false;
    }
  }, [user, processTransactionsByDay]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => getPreviousMonth(prev));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => getNextMonth(prev));
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    const isSameDate = currentDate.getDate() === today.getDate() &&
                      currentDate.getMonth() === today.getMonth() &&
                      currentDate.getFullYear() === today.getFullYear();
    
    if (!isSameDate) {
      setCurrentDate(today);
    }
  }, [currentDate]);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }, []);

  const handleAccountChange = useCallback((accountId: string | number) => {
    const newAccountId = accountId as string | 'all';
    setSelectedAccount(newAccountId);
  }, []);

  useEffect(() => {
    fetchUserAccounts();
  }, [fetchUserAccounts]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      fetchMonthTransactions(currentDate, selectedAccount);
    }, 100);
    return () => clearTimeout(timer);
  }, [user, currentDate, selectedAccount, fetchMonthTransactions]);

  const refreshAccounts = useCallback(async () => {
    if (!user) return;
    
    try {
      hasFetchedAccounts.current = false;
      await fetchUserAccounts();
    } catch (error) {
      console.error('Erro ao atualizar contas:', error);
    }
  }, [user, fetchUserAccounts]);

  return {
    currentDate,
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    additionalData,
    neighborMonths,
    setCurrentDate,
    setSelectedAccount,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    handleAccountChange,
    fetchMonthTransactions,
    refreshAccounts
  };
};