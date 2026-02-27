"use client";

export default function MonthlySummarySkeleton() {
  return (
    <div className="p-3 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="h-3 w-20 bg-slate-400/30 rounded mb-2" />
          <div className="h-4 w-20 bg-green-400/40 rounded" />
        </div>

        <div className="flex gap-4 sm:gap-8">
          <div>
            <div className="h-3 w-20 bg-slate-400/30 rounded mb-2" />
            <div className="h-4 w-20 bg-green-400/30 rounded" />
          </div>

          <div>
            <div className="h-3 w-20 bg-slate-400/30 rounded mb-2" />
            <div className="h-4 w-20 bg-red-400/30 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
