"use client";

import { useMemo } from "react";

export default function CalendarDaysSkeleton() {
  const numberOfWeeks = 5;

  const gridRows = useMemo(() => {
    return `repeat(${numberOfWeeks}, minmax(70px, 1fr))`;
  }, []);

  return (
    <div
      className="
        grid grid-cols-7
        gap-0 sm:gap-3
        p-2 sm:p-6
      "
      style={{
        gridTemplateRows: gridRows,
      }}
    >
      {[...Array(35)].map((_, index) => (
        <div
          key={index}
          className="
            relative flex flex-col
            rounded-none sm:rounded-2xl
            p-2 sm:p-3
            border
            border-white/5 dark:border-slate-800
            bg-white/10 dark:bg-slate-800/40
            animate-pulse
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="w-5 h-4 bg-slate-400/30 rounded" />
            <div className="w-1.5 h-1.5 bg-purple-400/30 rounded-full" />
          </div>

          {/* Saldo */}
          <div className="mt-auto text-center">
            <div className="h-3 w-12 mx-auto bg-slate-400/30 rounded" />
          </div>

          {/* Desktop extra info */}
          <div className="hidden sm:block mt-1 space-y-1">
            <div className="h-2 w-16 mx-auto bg-green-400/20 rounded" />
            <div className="h-2 w-14 mx-auto bg-red-400/20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
