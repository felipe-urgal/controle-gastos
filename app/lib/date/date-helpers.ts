export const createDateKey = (year: number, month: number, day: number): string => {
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

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
