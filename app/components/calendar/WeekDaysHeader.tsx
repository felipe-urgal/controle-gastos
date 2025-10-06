"use client";

import { dayNames } from '@/app/utils/calendarUtils';
import { useThemeColors } from '@/app/hook/useThemeColors';

export default function WeekDaysHeader({ resolvedTheme }: { resolvedTheme: any }) {
  const colors = useThemeColors();

  return (
    <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} border-t border-b ${colors.border.primary} w-full`}>
      {dayNames.map(day => (
        <div key={day} className={`${colors.calendar.header.bg} p-1 sm:p-2 text-center w-full`}>
          <span className={`text-xs sm:text-sm font-medium ${colors.text.secondary} hidden sm:inline`}>
            {day}
          </span>
          <span className={`text-xs font-medium ${colors.text.secondary} sm:hidden`}>
            {day.substring(0, 1)}
          </span>
        </div>
      ))}
    </div>
  );
};