"use client";

interface LoadingActionProps {
  message?: string;
}

export default function LoadingAction({
  message = "Processando...",
}: LoadingActionProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {message}
      </span>
    </div>
  );
}
