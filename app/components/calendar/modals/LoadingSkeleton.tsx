"use client";

interface Props {
  count?: number;
}

export default function LoadingSkeleton({ count = 4 }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="
            h-20
            rounded-2xl
            bg-white/10 dark:bg-slate-800/40
            backdrop-blur-xl
            border border-white/10 dark:border-slate-700
            animate-pulse
          "
        />
      ))}
    </div>
  );
}
