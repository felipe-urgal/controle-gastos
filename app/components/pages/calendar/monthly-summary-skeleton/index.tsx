'use client';

export default function MonthlySummarySkeleton() {
  return (
    <div className="grid animate-pulse border-b border-[var(--border)] sm:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`px-4 py-4 sm:px-5 ${index > 0 ? 'border-t border-[var(--border)] sm:border-l sm:border-t-0' : ''}`}
        >
          <div className="h-4 w-24 rounded-[var(--radius-sm)] bg-[var(--skeleton)]" />
          <div className="mt-3 h-7 w-32 rounded-[var(--radius-sm)] bg-[var(--skeleton)]" />
        </div>
      ))}
    </div>
  );
}
