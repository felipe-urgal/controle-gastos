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

export const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const dayNamesFull = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

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

export function formatDate(date: Date, format: string = 'dd/MM/yyyy'): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  // Nome do dia da semana (abreviado)
  const dayOfWeekShort = dayNames[date.getDay()];
  // Nome completo do dia da semana
  const dayOfWeekFull = dayNamesFull[date.getDay()];
  // Nome do mês
  const monthName = monthNames[date.getMonth()];

  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year.toString())
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('EEEE', dayOfWeekFull)
    .replace('EEE', dayOfWeekShort)
    .replace('MMMM', monthName)
    .replace('MMM', monthName.substring(0, 3));
};

export function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Função para obter o último dia do mês
export function getLastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

// Função para adicionar meses
export function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

// Função para subtrair meses
export function subtractMonths(date: Date, months: number): Date {
  return addMonths(date, -months);
};
