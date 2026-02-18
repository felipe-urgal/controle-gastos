"use client";

import { HiSearch, HiPlus } from "react-icons/hi";
import { Button } from "@/app/components";

interface EmptyStateProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onAddClick?: () => void;
  showButton?: boolean;
}

export default function EmptyState({
  title = "Nenhum item encontrado",
  description = "Adicione seu primeiro item para começar",
  buttonText = "Adicionar",
  onAddClick,
  showButton = true,
}: EmptyStateProps) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        text-center p-10
        rounded-2xl
        bg-white dark:bg-slate-900
        border border-white/10 dark:border-slate-800
        shadow-sm
      "
    >
      <div className="
        w-20 h-20
        rounded-2xl
        bg-gradient-to-br from-purple-500/20 to-indigo-500/20
        flex items-center justify-center
        mb-5
      ">
        <HiSearch className="w-6 h-6 text-slate-400" />
      </div>

      <h4 className="text-lg font-semibold mb-2">{title}</h4>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
        {description}
      </p>

      {showButton && onAddClick && (
        <Button
          onClick={onAddClick}
          variant="outline"
          size="md"
          icon={<HiPlus size={14} />}
          className="rounded-xl"
        >
          {buttonText}
        </Button>
      )}
    </div>
  );
}
