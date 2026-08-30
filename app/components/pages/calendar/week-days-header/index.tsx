'use client';

import { dayNamesFull } from '@/app/lib/date/constants';

export default function WeekDaysHeader() {
  return (
    <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-raised)]">
      {dayNamesFull.map((day) => (
        <div
          key={day}
          className="flex min-h-11 items-center justify-center border-r border-[var(--border)] px-1 text-center text-sm font-semibold text-[var(--text-muted)] last:border-r-0"
          aria-label={day}
        >
          <span className="sm:hidden" aria-hidden="true">
            {day.slice(0, 3)}
          </span>
          <span className="hidden sm:inline">{day}</span>
        </div>
      ))}
    </div>
  );
}
