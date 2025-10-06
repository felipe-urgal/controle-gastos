import { CalendarDay, Transaction } from '@/app/types/calendar';

export const getPreviousMonth = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setMonth(date.getMonth() - 1);
  return newDate;
};

export const getNextMonth = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setMonth(date.getMonth() + 1);
  return newDate;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

export const createDateKey = (year: number, month: number, day: number): string => {
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

export const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Função para gerar dias do calendário (usada nos calendários vizinhos)
export const generateCalendarDays = (date: Date): CalendarDay[] => {
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

// Função auxiliar para verificar se uma transação corresponde a uma data específica
export const isTransactionOnDate = (transaction: Transaction, date: Date): boolean => {
  const transactionYear = transaction.year;
  const transactionMonth = transaction.month;
  const transactionDay = transaction.day;
  
  return date.getFullYear() === transactionYear && 
         date.getMonth() + 1 === transactionMonth && // +1 porque getMonth() retorna 0-11
         date.getDate() === transactionDay;
};
