import { CalendarDay, Transaction } from '@/app/types/calendar';
import { isToday } from '@/app/lib/date/dateHelpers';

export const generateCalendarDays = (date: Date): CalendarDay[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startDay = firstDayOfMonth.getDay();
  const endDay = lastDayOfMonth.getDay();
  
  const days: CalendarDay[] = [];
  
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

export const isTransactionOnDate = (transaction: Transaction, date: Date): boolean => {
  const transactionYear = transaction.year;
  const transactionMonth = transaction.month;
  const transactionDay = transaction.day;
  
  return date.getFullYear() === transactionYear && 
         date.getMonth() + 1 === transactionMonth &&
         date.getDate() === transactionDay;
};
