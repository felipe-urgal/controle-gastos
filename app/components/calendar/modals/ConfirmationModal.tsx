"use client";

import { Button } from "@/app/components";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message = "Tem certeza que deseja realizar esta ação?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-md
          rounded-3xl
          bg-white/70 dark:bg-slate-900/70
          backdrop-blur-2xl
          border border-white/10 dark:border-slate-800
          shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]
          p-6
          animate-fade-in
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle
              className={`w-5 h-5 ${variantStyles[variant]}`}
            />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            icon={<FaTimes size={14} />}
            className="!p-2 rounded-xl"
          />
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl"
          >
            {cancelText}
          </Button>

          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className="flex-1 rounded-xl"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
