"use client";

import { dayNames } from '@/app/utils/calendarUtils';
import { useThemeColors } from '@/app/hook/useThemeColors';

export default function WeekDaysHeader({ resolvedTheme }: { resolvedTheme: any }) {
  const colors = useThemeColors();

  return (
    <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} w-full`}>
      {dayNames.map(day => (
        <div key={day} className={`${colors.calendar.header.bg} p-3 text-center`}>
          <span className={`text-sm font-medium ${colors.text.secondary}`}>
            {day}
          </span>
        </div>
      ))}
    </div>
  );
};