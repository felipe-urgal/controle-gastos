'use client';

export default function CalendarGridSkeleton() {
  return (
    <div
      className="grid grid-cols-7 auto-rows-[7.5rem] -mb-px -mr-px animate-pulse"
      aria-hidden="true"
    >
      {Array.from({ length: 35 }).map((_, index) => (
        <div key={index} className="border-b border-r border-[var(--border)] bg-[var(--surface)] p-2">
          <div className="h-7 w-7 rounded-full bg-[var(--skeleton)]" />
          <div className="mt-2 h-4 w-full max-w-20 rounded-[var(--radius-sm)] bg-[var(--skeleton)]" />
        </div>
      ))}
    </div>
  );
}
