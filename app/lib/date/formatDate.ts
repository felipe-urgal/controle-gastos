import { dayNames, dayNamesFull, monthNames } from './constants'

export function formatDate(date: Date, format: string = 'dd/MM/yyyy'): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const dayOfWeekShort = dayNames[date.getDay()];
  const dayOfWeekFull = dayNamesFull[date.getDay()];
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
