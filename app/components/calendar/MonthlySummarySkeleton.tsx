"use client";

export default function MonthlySummarySkeleton() {
  return (
    <div className="pb-4 sm:pb-6 pt-2">
      <div
        className="
          p-4 sm:p-6
          rounded-2xl
          bg-white/10 dark:bg-slate-800/40
          backdrop-blur-2xl
          border border-white/10 dark:border-slate-700
          shadow-[0_15px_40px_-15px_rgba(0,0,0,0.5)]
          animate-pulse
        "
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

          {/* Saldo */}
          <div>
            <div className="h-3 w-24 bg-slate-400/30 rounded mb-2" />
            <div className="h-7 sm:h-8 w-32 bg-slate-400/40 rounded" />
          </div>

          {/* Receita / Despesa */}
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
    </div>
  );
}
