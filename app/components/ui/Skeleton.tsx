"use client";

export default function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`}
    >
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
    </div>
  );
}