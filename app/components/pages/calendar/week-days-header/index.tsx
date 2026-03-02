"use client";

// importing libs
import { dayNamesFull } from "@/app/lib/date/constants";

export default function WeekDaysHeader() {
  return (
    <div
      className="grid grid-cols-7 text-[10px] sm:text-xs font-semibold tracking-wide uppercase text-center text-slate-400 bg-slate-900/40 backdrop-blur-md">
      {dayNamesFull.map((day) => (
        <div key={day} className="truncate border border-slate-600 py-2">
          <span className="sm:hidden">
            {day.slice(0, 3)}
          </span>

          <span className="hidden sm:inline">
            {day}
          </span>
        </div>
      ))}
    </div>
  );
};
