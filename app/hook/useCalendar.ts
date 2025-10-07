import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { CalendarDay, Account } from '@/app/types/calendar';
import { transactionService } from '@/app/services/transactionService';
import { getPreviousMonth, getNextMonth, createDateKey } from '@/app/utils/calendarUtils';

export const useCalendar = () => {
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAccount, setSelectedAccount] = useState<string | 'all'>('all');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cumulativeBalance, setCumulativeBalance] = useState(0);
  const [additionalData, setAdditionalData] = useState({
    income: "0",
    expenses: "0"
  });

  // Use ref to prevent infinite re-renders
  const selectedAccountRef = useRef(selectedAccount);

  // Estados para navegação
  const [neighborMonths, setNeighborMonths] = useState({
    previous: getPreviousMonth(currentDate),
    next: getNextMonth(currentDate)
  });

  // Update ref when selectedAccount changes
  useEffect(() => {
    selectedAccountRef.current = selectedAccount;
  }, [selectedAccount]);

  // Atualizar meses vizinhos quando currentDate mudar
  useEffect(() => {
    setNeighborMonths({
      previous: getPreviousMonth(currentDate),
      next: getNextMonth(currentDate)
    });
  }, [currentDate]);

  // Buscar contas do usuário
  const fetchUserAccounts = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/account?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAccounts(data.data.items || []);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
    }
  }, [user]);

  // Criar dia do calendário
  const createCalendarDay = useCallback((
    date: Date,
    isCurrentMonth: boolean,
    isToday: boolean,
    transactions: any[],
  ): CalendarDay => {
    const income = transactions
      .filter((t: any) => t.type === 'INCOME')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0) / 100;

    const expenses = transactions
      .filter((t: any) => t.type === 'EXPENSE')
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0) / 100;

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

  // Calcular saldo acumulado - FIXED: Added accountId parameter
  const calculateCumulativeInClient = async (userId: string, currentDate: Date, accountId: string | 'all' = 'all') => {
    try {
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      const response = await transactionService.getTransactions(userId, {
        year: currentYear.toString(),
        limit: "1000",
        account: accountId !== 'all' ? accountId : undefined
      });
      
      if (response.success && response.data.items) {
        let cumulative = 0;
        const transactions = response.data.items;
        const transactionsByMonth: { [key: number]: any[] } = {};
        
        transactions.forEach((transaction: any) => {
          const month = transaction.month || currentMonth;
          if (!transactionsByMonth[month]) {
            transactionsByMonth[month] = [];
          }
          transactionsByMonth[month].push(transaction);
        });
        
        for (let month = 1; month < currentMonth; month++) {
          const monthlyTransactions = transactionsByMonth[month] || [];
          const monthlyIncome = monthlyTransactions
            .filter((t: any) => t.type === 'INCOME')
            .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0) / 100;
            
          const monthlyExpenses = monthlyTransactions
            .filter((t: any) => t.type === 'EXPENSE')
            .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0) / 100;
            
          cumulative += (monthlyIncome - monthlyExpenses);
        }
        
        return cumulative;
      }
      
      return 0;
    } catch (error) {
      console.error('Erro ao calcular acumulado do ano:', error);
      return 0;
    }
  };

  // Processar transações por dia
  const processTransactionsByDay = useCallback((transactions: any[], currentDate: Date) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const today = new Date();

    const isTodayDate = (date: Date) => 
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    // Agrupar transações por dia
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

    // Dias do mês anterior
    const daysInPreviousMonth = new Date(year, month - 1, 0).getDate();
    const firstDay = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDay.getDay();
    const startDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    for (let i = startDay; i > 0; i--) {
      const date = new Date(year, month - 2, daysInPreviousMonth - i + 1);
      const dateKey = createDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const dayTransactions = transactionsByDay[dateKey] || [];
      days.push(createCalendarDay(date, false, isTodayDate(date), dayTransactions));
    }

    // Dias do mês atual
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateKey = createDateKey(year, month, day);
      const dayTransactions = transactionsByDay[dateKey] || [];
      days.push(createCalendarDay(date, true, isTodayDate(date), dayTransactions));
    }

    // Dias do próximo mês
    const totalCells = 42;
    const remainingDays = totalCells - days.length;
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month, day);
      const dateKey = createDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const dayTransactions = transactionsByDay[dateKey] || [];
      days.push(createCalendarDay(date, false, isTodayDate(date), dayTransactions));
    }

    // Garantir que temos exatamente 42 dias
    if (days.length !== 42) {
      while (days.length < 42) {
        let lastDate: Date;
        if (days.length > 0) {
          const lastDay = days[days.length - 1];
          lastDate = lastDay.date ? new Date(lastDay.date) : new Date(year, month, 1);
        } else {
          lastDate = new Date(year, month, 1);
        }
        lastDate.setDate(lastDate.getDate() + 1);
        const dateKey = createDateKey(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate());
        const dayTransactions = transactionsByDay[dateKey] || [];
        days.push(createCalendarDay(lastDate, false, isTodayDate(lastDate), dayTransactions));
      }
      if (days.length > 42) days.splice(42);
    }

    setCalendarDays(days);
  }, [createCalendarDay]);

  // Buscar transações do mês - FIXED: Added proper dependencies
  const fetchMonthTransactions = useCallback(async (date: Date, accountId: string | 'all' = 'all') => {
    setIsLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (!user) {
        console.error('User ID não encontrado');
        return;
      }

      const response = await transactionService.getTransactions(user.id, {
        year: year.toString(),
        month: month.toString(),
        limit: "1000",
        account: accountId !== 'all' ? accountId : undefined
      });

      const cumulativeResponse = await calculateCumulativeInClient(user.id, date, accountId);

      if (response.success) {
        processTransactionsByDay(response.data.items as any[], date);
      }

      if (response.data.additionalData) {
        setAdditionalData(response.data.additionalData);
      }

      if (cumulativeResponse) {
        setCumulativeBalance(cumulativeResponse || 0);
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, processTransactionsByDay]); // FIXED: Added missing dependency

  // Navegação
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => getPreviousMonth(prev));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => getNextMonth(prev));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }, []);

  const handleAccountChange = useCallback((accountId: string | number) => {
    const newAccountId = accountId as string | 'all';
    setSelectedAccount(newAccountId);
    fetchMonthTransactions(currentDate, newAccountId);
  }, [currentDate, fetchMonthTransactions]);

  const preventBodyScroll = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '15px';
    return scrollY;
  }, []);

  const restoreBodyScroll = useCallback((scrollY: number) => {
    if (typeof window === 'undefined') return;
    
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, scrollY);
  }, []);

  // Buscar contas quando o usuário mudar
  useEffect(() => {
    fetchUserAccounts();
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      const scrollY = preventBodyScroll();
      return () => {
        restoreBodyScroll(scrollY);
      };
    }
  }, [fetchUserAccounts, preventBodyScroll, restoreBodyScroll]);

  // Buscar transações quando o mês ou conta mudar
  useEffect(() => {
    if (!user) return;
    fetchMonthTransactions(currentDate, selectedAccount);
  }, [user, currentDate, selectedAccount, fetchMonthTransactions]);

  return {
    // Estados
    currentDate,
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    cumulativeBalance,
    additionalData,
    neighborMonths,
    
    // Ações
    setCurrentDate,
    setSelectedAccount,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    handleAccountChange,
    fetchMonthTransactions
  };
};
