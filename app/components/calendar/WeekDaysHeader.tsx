"use client";

import { dayNames } from '@/app/utils/calendarUtils';

export default function WeekDaysHeader({ resolvedTheme }: { resolvedTheme: any }) {
  return (
    <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'text-white bg-gray-700 border-gray-500' : 'text-dark bg-gray-200 border-gray-500'} border w-full`}>
      {dayNames.map((day, i) => (
        <div key={day} className={`${i === 0 ? "" : "border-s"} ${resolvedTheme === 'dark' ? 'border-gray-500' : 'border-gray-500'} p-2 text-center`}>
          <span className={`text-sm font-medium`}>
            {day}
          </span>
        </div>
      ))}
    </div>
  );
};