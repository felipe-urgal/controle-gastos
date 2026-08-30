'use client';

export default function CalendarGridSkeleton() {
  return (
    <div
      className="grid grid-cols-7 auto-rows-[88px] animate-pulse md:auto-rows-[118px]"
      aria-hidden="true"
    >
      {Array.from({ length: 35 }).map((_, index) => (
        <div
          key={index}
          className="border-b border-r border-[var(--border)] bg-[var(--surface)] p-1.5 md:p-2.5"
        >
          <div className="flex items-start justify-between gap-1">
            <div className="h-7 w-7 rounded-full bg-[var(--skeleton)]" />
            <div className="h-5 w-6 rounded-full bg-[var(--skeleton)]" />
          </div>
          <div className="mt-3 h-4 w-full max-w-16 rounded-[var(--radius-sm)] bg-[var(--skeleton)]" />
          <div className="mt-2 hidden h-4 w-full max-w-20 rounded-[var(--radius-sm)] bg-[var(--skeleton)] md:block" />
        </div>
      ))}
    </div>
  );
}
