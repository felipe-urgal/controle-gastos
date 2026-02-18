"use client";

import { dayNames } from "@/app/utils";
import { useTheme } from "@/app/context";

export default function WeekDaysHeader() {
  const { resolvedTheme } = useTheme();

  return (
    <div
      className={`
        grid grid-cols-7
        py-2 sm:py-3
        text-[10px] sm:text-xs
        font-semibold tracking-wide uppercase
        text-center
        border-0
        ${
          resolvedTheme === "dark"
            ? "text-slate-400 border-slate-800 bg-slate-900/40"
            : "text-slate-500 border-slate-200 bg-white/40"
        }
        backdrop-blur-md
      `}
    >
      {dayNames.map((day) => (
        <div key={day} className="truncate">
          {/* Mobile: só 3 letras */}
          <span className="sm:hidden">
            {day.slice(0, 3)}
          </span>

          {/* Desktop: nome completo */}
          <span className="hidden sm:inline">
            {day}
          </span>
        </div>
      ))}
    </div>
  );
}