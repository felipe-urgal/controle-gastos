"use client";

// importing hooks
import { Suspense, useState, useEffect, useRef, useCallback } from 'react';

// importing context
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";

// importing icons
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";

// importing types
import { CalendarDay, Transaction, Investment, Account } from "@/app/types/calendar";

// importing components
import { CalendarDaysSkeleton, MonthlySummarySkeleton, DayModal } from '@/app/components';

// Funções auxiliares
function getPreviousMonth(date: Date) {
  const newDate = new Date(date);
  newDate.setMonth(date.getMonth() - 1);
  return newDate;
}

function getNextMonth(date: Date) {
  const newDate = new Date(date);
  newDate.setMonth(date.getMonth() + 1);
  return newDate;
}

const isToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

const generateCalendarDays = (date: Date): CalendarDay[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startDay = firstDayOfMonth.getDay();
  const endDay = lastDayOfMonth.getDay();
  
  const days: CalendarDay[] = [];
  
  // Dias do mês anterior
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const dayDate = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      date: dayDate,
      isCurrentMonth: false,
      isToday: isToday(dayDate),
      income: 0,
      expenses: 0,
      transactions: [],
      investments: []
    });
  }
  
  // Dias do mês atual
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const dayDate = new Date(year, month, i);
    days.push({
      date: dayDate,
      isCurrentMonth: true,
      isToday: isToday(dayDate),
      income: Math.random() > 0.7 ? Math.random() * 1000 : 0,
      expenses: Math.random() > 0.7 ? Math.random() * 500 : 0,
      transactions: [],
      investments: []
    });
  }
  
  // Dias do próximo mês
  for (let i = 1; i <= (6 - endDay); i++) {
    const dayDate = new Date(year, month + 1, i);
    days.push({
      date: dayDate,
      isCurrentMonth: false,
      isToday: isToday(dayDate),
      income: 0,
      expenses: 0,
      transactions: [],
      investments: []
    });
  }
  
  return days;
};

// Função para criar chave de data baseada em year, month, day
const createDateKey = (year: number, month: number, day: number): string => {
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

// Função para verificar se uma transação corresponde a uma data específica
// const isTransactionOnDate = (transaction: Transaction, date: Date): boolean => {
//   const transactionYear = transaction.year;
//   const transactionMonth = transaction.month;
//   const transactionDay = transaction.day;
  
//   return date.getFullYear() === transactionYear && 
//          date.getMonth() + 1 === transactionMonth && // +1 porque getMonth() retorna 0-11
//          date.getDate() === transactionDay;
// };

export default function Calendar() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();

  const [selectedAccount, setSelectedAccount] = useState<string | 'all'>('all');
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [additionalData, setAdditionalData] = useState({
    income: "0",
    expenses: "0"
  });

  const [dayInvestments, setDayInvestments] = useState<Investment[]>([]);

  // Estados para swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [neighborMonths, setNeighborMonths] = useState({
    previous: getPreviousMonth(currentDate),
    next: getNextMonth(currentDate)
  });

  const minSwipeDistance = 10;

  // Atualizar meses vizinhos quando currentDate mudar
  useEffect(() => {
    setNeighborMonths({
      previous: getPreviousMonth(currentDate),
      next: getNextMonth(currentDate)
    });
  }, [currentDate]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setSwipeOffset(0);
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    const distance = currentTouch - touchStart;
    const limitedDistance = Math.max(-100, Math.min(100, distance));
    setSwipeOffset(limitedDistance);
  };

  const onTouchEnd = () => {
    setIsSwiping(false);
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > -minSwipeDistance;
    const isRightSwipe = distance < minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      setSwipeOffset(isLeftSwipe ? window.innerWidth : -window.innerWidth);
      
      setTimeout(() => {
        if (isLeftSwipe) {
          goToNextMonth();
        } else if (isRightSwipe) {
          goToPreviousMonth();
        }
        setSwipeOffset(0);
      }, 300);
    } else {
      setSwipeOffset(0);
    }
  };

  // Funções de navegação
  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

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

  // Buscar contas quando o usuário mudar
  useEffect(() => {
    fetchUserAccounts();
  }, [fetchUserAccounts]);

  // Handler para mudar conta selecionada
  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    fetchMonthTransactions(currentDate, accountId);
  };

  // Função para criar dias do calendário
  const createCalendarDay = useCallback((
    date: Date,
    isCurrentMonth: boolean,
    isToday: boolean,
    transactions: Transaction[],
    investments: Investment[]
  ): CalendarDay => {
    // AGORA: amount é number (centavos)
    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0) / 100; // Converter para reais

    const expenses = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0) / 100; // Converter para reais

    return {
      date,
      isCurrentMonth,
      isToday,
      income,
      expenses,
      transactions,
      investments,
    };
  }, []);

  // Função para buscar transações de um dia específico - ATUALIZADA
  const fetchDayTransactions = useCallback(async (date: Date, accountId: string | 'all' = 'all') => {
    setIsModalLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      if (!user) {
        console.error('User ID não encontrado');
        return;
      }

      // Construir URL com filtro de conta
      let url = `/api/transactions?userId=${user.id}&year=${year}&month=${month}&limit=1000`;
      if (accountId !== 'all') {
        url += `&accountId=${accountId}`;
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          // Filtrar transações pelo dia específico usando year, month, day
          const dayTransactions = data.data.items.filter((transaction: Transaction) => {
            return transaction.year === year && 
                   transaction.month === month && 
                   transaction.day === day;
          });
          
          setDayTransactions(dayTransactions);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar transações do dia:', error);
    } finally {
      setIsModalLoading(false);
    }
  }, [user]);

  // Processar transações e agrupar por dia - ATUALIZADA
  const processTransactionsByDay = useCallback((transactions: Transaction[], investments: Investment[], currentDate: Date) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // +1 porque no modelo month é 1-12
    
    // Agrupar transações por dia usando year, month, day
    const transactionsByDay: { [key: string]: Transaction[] } = {};
    transactions.forEach(transaction => {
      const dateKey = createDateKey(transaction.year, transaction.month, transaction.day);
      if (!transactionsByDay[dateKey]) transactionsByDay[dateKey] = [];
      transactionsByDay[dateKey].push(transaction);
    });

    // Agrupar investimentos por dia (se aplicável)
    // const investmentsByDay: { [key: string]: Investment[] } = {};
    // investments.forEach(investment => {
    //   // TODO: Ajustar quando tiver investimentos com o novo modelo
    //   const dateKey = createDateKey(investment.year, investment.month, investment.day);
    //   if (!investmentsByDay[dateKey]) investmentsByDay[dateKey] = [];
    //   investmentsByDay[dateKey].push(investment);
    // });

    const days: CalendarDay[] = [];
    const today = new Date();

    const isToday = (date: Date) => 
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    // Dias do mês anterior
    const daysInPreviousMonth = new Date(year, month - 1, 0).getDate();
    const firstDay = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDay.getDay();
    const startDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = startDay; i > 0; i--) {
      const date = new Date(year, month - 2, daysInPreviousMonth - i + 1);
      const dateKey = createDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const dayTransactions = transactionsByDay[dateKey] || [];
      // const dayInvestments = investmentsByDay[dateKey] || [];
      days.push(createCalendarDay(date, false, isToday(date), dayTransactions, []));
    }

    // Dias do mês atual
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateKey = createDateKey(year, month, day);
      const dayTransactions = transactionsByDay[dateKey] || [];
      // const dayInvestments = investmentsByDay[dateKey] || [];
      days.push(createCalendarDay(date, true, isToday(date), dayTransactions, []));
    }

    // Dias do próximo mês
    const totalCells = 42;
    const remainingDays = totalCells - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month, day);
      const dateKey = createDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const dayTransactions = transactionsByDay[dateKey] || [];
      // const dayInvestments = investmentsByDay[dateKey] || [];
      days.push(createCalendarDay(date, false, isToday(date), dayTransactions, []));
    }

    // Garantir que temos exatamente 42 dias
    if (days.length !== 42) {
      while (days.length < 42) {
        const lastDate = days.length > 0 ? new Date(days[days.length - 1].date) : new Date(year, month, 1);
        lastDate.setDate(lastDate.getDate() + 1);
        const dateKey = createDateKey(lastDate.getFullYear(), lastDate.getMonth() + 1, lastDate.getDate());
        const dayTransactions = transactionsByDay[dateKey] || [];
        // const dayInvestments = investmentsByDay[dateKey] || [];
        days.push(createCalendarDay(lastDate, false, isToday(lastDate), dayTransactions, []));
      }
      if (days.length > 42) days.splice(42);
    }

    setCalendarDays(days);
  }, [createCalendarDay]);

  const [cumulativeBalance, setCumulativeBalance] = useState(0);

  const calculateCumulativeInClient = async (userId: string, currentDate: Date) => {
    try {
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // +1 porque no modelo month é 1-12
      
      // Buscar todas as transações do ano atual
      const response = await fetch(
        `/api/transactions?userId=${userId}&year=${currentYear}&limit=1000`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.items) {
          let cumulative = 0;
          
          // Calcular saldo apenas dos meses anteriores ao atual
          const transactions = data.data.items;
          const transactionsByMonth: { [key: number]: Transaction[] } = {};
          
          // Agrupar transações por mês usando o campo month (1-12)
          transactions.forEach((transaction: Transaction) => {
            const month = transaction.month; // 1-12
            
            if (!transactionsByMonth[month]) {
              transactionsByMonth[month] = [];
            }
            transactionsByMonth[month].push(transaction);
          });
          
          // Calcular saldo apenas dos meses anteriores ao atual
          for (let month = 1; month < currentMonth; month++) {
            const monthlyTransactions = transactionsByMonth[month] || [];
            
            // AGORA: amount é number (centavos)
            const monthlyIncome = monthlyTransactions
              .filter(t => t.type === 'INCOME')
              .reduce((sum, t) => sum + Number(t.amount), 0) / 100; // Converter para reais
              
            const monthlyExpenses = monthlyTransactions
              .filter(t => t.type === 'EXPENSE')
              .reduce((sum, t) => sum + Number(t.amount), 0) / 100; // Converter para reais
              
            cumulative += (monthlyIncome - monthlyExpenses);
          }
          
          return cumulative;
        }
      }
      
      return 0;
    } catch (error) {
      console.error('Erro ao calcular acumulado do ano:', error);
      return 0;
    }
  };

  const fetchMonthTransactions = useCallback(async (date: Date, accountId: string | 'all' = 'all') => {
    setIsLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (!user) {
        console.error('User ID não encontrado');
        return;
      }

      // Construir URL com filtro de conta
      let transactionsUrl = `/api/transactions?userId=${user.id}&year=${year}&month=${month}&limit=1000`;
      if (accountId !== 'all') {
        transactionsUrl += `&accountId=${accountId}`;
      }

      const response = await fetch(transactionsUrl);

      const cumulativeResponse = await calculateCumulativeInClient(user.id, date);

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          // Processar apenas transações, investimentos vazios por enquanto
          processTransactionsByDay(data.data.items, [], date);
        }

        if (data.data.additionalData) {
          setAdditionalData(data.data.additionalData);
        }

        if (cumulativeResponse) {
          setCumulativeBalance(cumulativeResponse || 0);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, processTransactionsByDay]);

  // AGORA: Converter additionalData para números (já estão em reais)
  const currentMonthBalance = parseFloat(additionalData.income) - parseFloat(additionalData.expenses);
  const totalBalance = cumulativeBalance + currentMonthBalance;

  // Função para buscar transações do mês
  const handleTransactionsChange = () => {
    if (selectedDate) {
      fetchDayTransactions(selectedDate, selectedAccount);
      fetchMonthTransactions(currentDate, selectedAccount);
    }
  };

  const goToDate = (date: Date) => {
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  // Abrir modal com transações do dia
  const handleDayClick = async (day: CalendarDay) => {
    setSelectedDate(day.date);
    
    if (!day.isCurrentMonth) {
      goToDate(day.date);
      return;
    }
    
    setIsModalOpen(true);
    await fetchDayTransactions(day.date, selectedAccount);
  };

  // Corrigido: useEffect com todas as dependências
  useEffect(() => {
    const openModalForSelectedDate = async () => {
      if (selectedDate && !isModalOpen) {
        const isInCurrentMonth = selectedDate.getMonth() === currentDate.getMonth() && 
                                selectedDate.getFullYear() === currentDate.getFullYear();
        
        if (isInCurrentMonth) {
          setIsModalOpen(true);
          await fetchDayTransactions(selectedDate, selectedAccount);
        }
      }
    };

    openModalForSelectedDate();
  }, [currentDate, selectedDate, isModalOpen, fetchDayTransactions, selectedAccount])

  // Fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setDayTransactions([]);
    setDayInvestments([]);
  };

  // Buscar transações quando o mês mudar
  useEffect(() => {
    if (!user) return;
    fetchMonthTransactions(currentDate);
  }, [user, currentDate, fetchMonthTransactions]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getThemeColors = () => {
    if (resolvedTheme === 'dark') {
      return {
        bg: 'bg-gray-900',
        bgSecondary: 'bg-gray-800',
        text: 'text-gray-100',
        textSecondary: 'text-gray-300',
        textTertiary: 'text-gray-400',
        border: 'border-gray-700',
        borderSecondary: 'border-gray-600',
        calendarBg: 'bg-gray-800',
        calendarBorder: 'border-gray-700',
        dayBg: 'bg-gray-800',
        dayBgCurrent: 'bg-gray-700',
        dayBgToday: 'bg-blue-900/30',
        dayText: 'text-gray-100',
        dayTextMuted: 'text-gray-700',
        dayBgOther: 'bg-gray-500/50',
        headerBg: 'bg-gray-800',
        skeletonBg: 'bg-gray-700',
        skeletonLight: 'bg-gray-600',
      };
    }
    
    return {
      bg: 'bg-white',
      bgSecondary: 'bg-gray-50',
      text: 'text-gray-800',
      textSecondary: 'text-gray-600',
      textTertiary: 'text-gray-500',
      border: 'border-gray-200',
      borderSecondary: 'border-gray-300',
      calendarBg: 'bg-white',
      calendarBorder: 'border-gray-200',
      dayBg: 'bg-white',
      dayBgCurrent: 'bg-gray-50',
      dayBgToday: 'bg-blue-50',
      dayText: 'text-gray-800',
      dayTextMuted: 'text-gray-400',
      dayBgOther: 'bg-gray-100/50',
      headerBg: 'bg-white',
      skeletonBg: 'bg-gray-300',
      skeletonLight: 'bg-gray-200',
    };
  };

  const colors = getThemeColors();

  // Resto do componente permanece igual...
  // [O restante do código do componente permanece inalterado, apenas as funções acima foram atualizadas]

  return (
    <Suspense fallback={
      <div className={`${colors.calendarBg} rounded-lg shadow-md w-full h-screen`}>
        <div className={`p-4 sm:p-6 border-b ${colors.border}`}>
          <div className={`h-6 sm:h-8 ${colors.skeletonBg} rounded w-48 sm:w-64 mb-4`}></div>
          <MonthlySummarySkeleton />
        </div>
        <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
          {[...Array(7)].map((_, index) => (
            <div key={index} className={`${colors.headerBg} p-2 sm:p-4 text-center`}>
              <div className={`h-3 sm:h-4 ${colors.skeletonBg} rounded mx-auto w-3/4`}></div>
            </div>
          ))}
        </div>
        <CalendarDaysSkeleton />
      </div>
    }>
      <div className="w-full min-h-screen overflow-hidden relative">
        {/* Calendário do Mês Anterior (escondido à esquerda) */}
        <div className={`absolute inset-0 transition-opacity duration-300 z-0 ${
          swipeOffset < 0 ? 'opacity-70' : 'opacity-0'
        }`}>
          <div className={`${colors.calendarBg} rounded-3xl shadow-3xl w-full h-full`} 
               style={{ transform: `translateX(${100 + swipeOffset * 0.5}%)` }}>
            {/* Header do mês anterior */}
            <div className={`px-3 pt-1 sm:pt-0 sm:px-4 border-b ${colors.border}`}>
              <div className={`flex items-center justify-between mb-4 pb-2 sm:mb-0 border-b ${colors.border}`}>
                <h2 className={`text-lg sm:text-2xl font-bold ${colors.textTertiary}`}>
                  {monthNames[neighborMonths.previous.getMonth()]} {neighborMonths.previous.getFullYear()}
                </h2>
              </div>
            </div>
            {/* Grid simplificado do mês anterior */}
            <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
              {generateCalendarDays(neighborMonths.previous).map((day, index) => (
                <div key={index} className={`min-h-[60px] p-1 ${colors.dayBg}`}>
                  <div className={`text-center text-xs ${
                    day.isCurrentMonth ? colors.textTertiary : colors.textTertiary
                  }`}>
                    {day.date.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendário do Próximo Mês (escondido à direita) */}
        <div className={`absolute inset-0 transition-opacity duration-300 z-0 ${
          swipeOffset > 0 ? 'opacity-70' : 'opacity-0'
        }`}>
          <div className={`${colors.calendarBg} rounded-3xl shadow-3xl w-full h-full`}
               style={{ transform: `translateX(${-100 + swipeOffset * 0.5}%)` }}>
            {/* Header do próximo mês */}
            <div className={`px-3 pt-1 sm:pt-0 sm:px-4 border-b ${colors.border}`}>
              <div className={`flex items-center justify-between mb-4 pb-2 sm:mb-0 border-b ${colors.border}`}>
                <h2 className={`text-lg sm:text-2xl font-bold ${colors.textTertiary}`}>
                  {monthNames[neighborMonths.next.getMonth()]} {neighborMonths.next.getFullYear()}
                </h2>
              </div>
            </div>
            {/* Grid simplificado do próximo mês */}
            <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
              {generateCalendarDays(neighborMonths.next).map((day, index) => (
                <div key={index} className={`min-h-[60px] p-1 ${colors.dayBg}`}>
                  <div className={`text-center text-xs ${
                    day.isCurrentMonth ? colors.textTertiary : colors.textTertiary
                  }`}>
                    {day.date.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendário Principal (com swipe) */}
        <div 
          ref={calendarRef}
          className={`${colors.calendarBg} rounded-3xl shadow-3xl w-full relative z-10 transition-transform duration-300 ease-out`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Cabeçalho do calendário - Mobile Optimized */}
          <div className={`px-3 pt-2 sm:px-4 border-b ${colors.border}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-6 pb-3 sm:pb-0 border-b ${colors.border}`}>
              {/* Lado Esquerdo - Navegação do Mês */}
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto">
                {/* Título do Mês e Botão Hoje */}
                <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none">
                  <h2 className={`text-xl sm:text-2xl font-bold ${colors.text} whitespace-nowrap truncate min-w-0`}>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
                  >
                    Hoje
                  </button>
                </div>

                {/* Navegação por Mês - Mobile */}
                <div className="flex items-center gap-1 sm:hidden">
                  <button
                    onClick={goToPreviousMonth}
                    className={`p-2 rounded-full ${
                      resolvedTheme === 'dark' 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    } transition-colors ${colors.textSecondary} flex-shrink-0`}
                    aria-label="Mês anterior"
                  >
                    <HiChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={goToNextMonth}
                    className={`p-2 rounded-full ${
                      resolvedTheme === 'dark' 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    } transition-colors ${colors.textSecondary} flex-shrink-0`}
                    aria-label="Próximo mês"
                  >
                    <HiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Lado Direito - Filtros e Navegação Desktop */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                {/* Filtro de Contas */}
                <div className="flex-1 sm:flex-none min-w-0">
                  <select
                    value={selectedAccount}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    className={`w-full sm:w-48 text-sm px-3 py-2 rounded-lg border transition-colors ${
                      resolvedTheme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500' 
                        : 'bg-white border-gray-300 text-gray-800 hover:border-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="all">Todas as contas</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Navegação por Mês - Desktop */}
                <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={goToPreviousMonth}
                    className={`p-2 rounded-full ${
                      resolvedTheme === 'dark' 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    } transition-colors ${colors.textSecondary} hover:scale-105 active:scale-95`}
                    aria-label="Mês anterior"
                  >
                    <HiChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <button
                    onClick={goToNextMonth}
                    className={`p-2 rounded-full ${
                      resolvedTheme === 'dark' 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    } transition-colors ${colors.textSecondary} hover:scale-105 active:scale-95`}
                    aria-label="Próximo mês"
                  >
                    <HiChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* RESUMO MENSAL - Responsivo */}
            {isLoading ? (
              <MonthlySummarySkeleton />
            ) : (
              <div className="my-4 w-full">
                {/* Grid principal para desktop */}
                <div className="hidden sm:flex items-center justify-center w-full">
                  <div className="grid grid-cols-12 gap-3 w-full">
                    {/* SALDO DO MÊS ATUAL */}
                    <div className={`${resolvedTheme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} p-2 rounded-3xl border flex flex-col items-center w-full`}>
                      <span className={`text-xs ${resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-600'} font-medium`}>Saldo do Mês</span>
                      <span className={`text-xs font-bold ${resolvedTheme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                        {user?.showValues ? formatCurrency(currentMonthBalance) : '*****'}
                      </span>
                      <div className="text-[10px] text-gray-500 mt-1 text-center">
                        {user?.showValues && (
                          <div>Receitas - Despesas</div>
                        )}
                      </div>
                    </div>

                    {/* SALDO ACUMULADO (MESES ANTERIORES) */}
                    <div className={`${resolvedTheme === 'dark' ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'} p-2 rounded-3xl border flex flex-col items-center w-full`}>
                      <span className={`text-xs ${resolvedTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'} font-medium`}>Saldo Acumulado</span>
                      <span className={`text-xs font-bold ${resolvedTheme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                        {user?.showValues ? formatCurrency(cumulativeBalance) : '*****'}
                      </span>
                      <div className="text-[10px] text-gray-500 mt-1 text-center">
                        {user?.showValues && (
                          <div>Meses anteriores</div>
                        )}
                      </div>
                    </div>

                    {/* SALDO TOTAL (SOMA DE TUDO) */}
                    <div className={`p-2 rounded-3xl border flex flex-col items-center w-full ${
                      totalBalance >= 0 
                        ? `${resolvedTheme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`
                        : `${resolvedTheme === 'dark' ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`
                    }`}>
                      <span className={`text-xs font-medium ${colors.textSecondary}`}>Saldo Total</span>
                      <span className={`text-xs font-bold ${
                        totalBalance >= 0
                          ? `${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}` 
                          : `${resolvedTheme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`
                      }`}>
                        {user?.showValues ? formatCurrency(totalBalance) : '*****'}
                      </span>
                      <div className="text-[10px] text-gray-500 mt-1 text-center">
                        {user?.showValues && (
                          <div>Acumulado + Este mês</div>
                        )}
                      </div>
                    </div>                
                  </div>
                </div>

                {/* Grid simplificado para mobile */}
                <div className="sm:hidden space-y-2 w-full">
                  {/* LINHA 2: Três Saldos */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`${resolvedTheme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'} p-2 rounded-xl border flex flex-col items-center w-full`}>
                      <span className={`text-[10px] ${resolvedTheme === 'dark' ? 'text-green-400' : 'text-green-600'} font-medium`}>Saldo Mês</span>
                      <span className={`text-xs font-bold ${resolvedTheme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                        {user?.showValues ? formatCurrency(currentMonthBalance) : '***'}
                      </span>
                    </div>
                    
                    <div className={`${resolvedTheme === 'dark' ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'} p-2 rounded-xl border flex flex-col items-center w-full`}>
                      <span className={`text-[10px] ${resolvedTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'} font-medium`}>Acumulado</span>
                      <span className={`text-xs font-bold ${resolvedTheme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                        {user?.showValues ? formatCurrency(cumulativeBalance) : '***'}
                      </span>
                    </div>
                    
                    <div className={`p-2 rounded-xl border flex flex-col items-center w-full ${
                      totalBalance >= 0 
                        ? `${resolvedTheme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}` 
                        : `${resolvedTheme === 'dark' ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`
                    }`}>
                      <span className={`text-[10px] font-medium ${colors.textSecondary}`}>Total</span>
                      <span className={`text-xs font-bold ${
                        totalBalance >= 0
                          ? `${resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}` 
                          : `${resolvedTheme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`
                      }`}>
                        {user?.showValues ? formatCurrency(totalBalance) : '***'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dias da semana - Mobile Optimized */}
          <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} border-b ${colors.border} w-full`}>
            {dayNames.map(day => (
              <div key={day} className={`${colors.headerBg} p-1 sm:p-2 text-center w-full`}>
                <span className={`text-xs sm:text-sm font-medium ${colors.textSecondary} hidden sm:inline`}>
                  {day}
                </span>
                <span className={`text-xs font-medium ${colors.textSecondary} sm:hidden`}>
                  {day.substring(0, 1)}
                </span>
              </div>
            ))}
          </div>

          {/* Grid de dias - Mobile Optimized */}
          {isLoading ? (
            <CalendarDaysSkeleton />
          ) : (
            <div className={` grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} w-full`}>
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`
                    min-h-[80px] sm:min-h-[120px] p-0 sm:p-2 cursor-pointer transition-colors border-0
                    ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} ${colors.border} relative w-full
                    ${day.isCurrentMonth ? `${colors.dayText} ${colors.dayBg}` : `${colors.dayTextMuted} ${colors.dayBgOther}`}
                    ${day.isToday ? `${colors.dayBgToday} ${resolvedTheme === 'dark' ? 'border-blue-700' : 'border-blue-200'}` : ''}
                  `}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={`
                    flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium mb-1 sm:mb-2 mx-auto
                    ${day.isToday ? 'bg-blue-500 text-white' : ''}
                    ${!day.isCurrentMonth && day.isToday ? 'bg-blue-300' : ''}
                  `}>
                    {day.date.getDate()}
                  </div>
                  
                  {/* Resumo financeiro do dia - Mobile Simplified */}
                  <div className="space-y-0 sm:space-y-1 w-full">
                    {day.income > 0 && (
                      <div className="text-[7px] sm:text-xs text-green-600 font-medium truncate text-center">
                        {user?.showValues ? formatCurrency(day.income) : '*****' }
                      </div>
                    )}
                    {day.expenses > 0 && (
                      <div className="text-[7px] sm:text-xs text-red-600 font-medium truncate text-center">
                        {user?.showValues ? formatCurrency(day.expenses) : '*****' }
                      </div>
                    )}
                    
                    {/* Indicador de transações - Mobile Simplified */}
                    {day.transactions.length > 0 && (
                      <div className={`text-[7px] sm:text-xs ${colors.textTertiary} mt-0.5 sm:mt-2 text-center truncate`}>
                        <span className="">
                          {day.transactions.length} transação{day.transactions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {day.investments && day.investments.length > 0 && (
                      <div className="text-[7px] sm:text-xs text-indigo-500 mt-0.5 sm:mt-1 text-center truncate">
                        <span className="">
                          {day.investments.length} investimento{day.investments.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de transações do dia */}
        <DayModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedDate={selectedDate}
          transactions={dayTransactions}
          investments={dayInvestments} 
          isLoading={isModalLoading}
          onTransactionsChange={handleTransactionsChange}
        />

        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 ${resolvedTheme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-black text-white'} bg-opacity-50 px-3 py-1 rounded-full text-sm transition-opacity duration-300 z-20 ${
          isSwiping ? 'opacity-100' : 'opacity-0'
        }`}>
          {swipeOffset > 0 ? '← Mês anterior' : swipeOffset < 0 ? 'Próximo mês →' : 'Arraste para os lados'}
        </div>
      </div>
    </Suspense>
  );
}
