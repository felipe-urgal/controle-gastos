"use client";

// importing hooks
import { useMemo } from "react";

export default function CalendarGridSkeleton() {
  const numberOfWeeks = 5;

  const gridRows = useMemo(() => {
    return `repeat(${numberOfWeeks}, minmax(70px, 1fr))`;
  }, []);

  return (
    <div
      className="grid grid-cols-7 gap-0"
      style={{ gridTemplateRows: gridRows }}
    >
      {[...Array(30)].map((_, index) => (
        <div
          key={index}
          className="animate-pulse relative flex flex-col rounded-none p-1 sm:p-3 transition-all duration-300 cursor-pointer border bg-white/10 dark:bg-slate-800/40 border-white/5 dark:border-slate-800"
        >
          <div className="flex items-center justify-between">
            <div className="w-5 h-4 bg-slate-400/30 rounded" />
            <div className="w-1.5 h-1.5 bg-purple-400/30 rounded-full" />
          </div>

          <div className="mt-auto text-center">
            <div className="h-3 w-12 mx-auto bg-slate-400/30 rounded" />
          </div>

          <div className="hidden sm:block mt-1 space-y-1">
            <div className="h-2 w-16 mx-auto bg-green-400/20 rounded" />
            <div className="h-2 w-14 mx-auto bg-red-400/20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
