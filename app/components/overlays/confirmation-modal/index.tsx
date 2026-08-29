"use client";

import { useEffect, useId, useRef } from "react";

import { FaExclamationTriangle, FaTrash, FaInfoCircle, FaBan } from "react-icons/fa";

import { Button } from "@/app/components/ui";

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
  showCancelButton?: boolean;
};

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
  showCancelButton = true,
}: ConfirmationModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: FaExclamationTriangle,
      iconColor: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      buttonColor: "danger",
      titleColor: "text-red-400"
    },
    warning: {
      icon: FaExclamationTriangle,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      buttonColor: "warning",
      titleColor: "text-yellow-400"
    },
    info: {
      icon: FaInfoCircle,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      buttonColor: "primary",
      titleColor: "text-blue-400"
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={`
            w-full max-w-md
            rounded-2xl
            bg-gradient-to-br from-slate-900 to-slate-800
            border ${config.borderColor}
            shadow-2xl
            overflow-hidden
          `}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !isLoading) {
              event.preventDefault();
              onClose();
            }
          }}
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className={`
                w-12 h-12 rounded-xl
                ${config.bgColor} border ${config.borderColor}
                flex items-center justify-center shrink-0
              `} aria-hidden="true">
                <Icon className={`w-6 h-6 ${config.iconColor}`} />
              </div>

              <h3 id={titleId} className={`text-lg font-semibold ${config.titleColor}`}>
                {title}
              </h3>
            </div>

            <div className="mt-3">
              <p id={descriptionId} className="text-sm text-slate-300 leading-relaxed">
                {message}
              </p>

              {variant === "danger" && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                  <p className="text-xs text-red-400 flex items-start gap-2">
                    <FaBan className="shrink-0 mt-0.5" size={12} aria-hidden="true" />
                    <span>Esta ação é irreversível e removerá permanentemente todos os dados associados.</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-3">
              {showCancelButton && (
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  {cancelText}
                </Button>
              )}

              <Button
                variant={config.buttonColor as "danger" | "warning" | "primary"}
                onClick={onConfirm}
                isLoading={isLoading}
                disabled={isLoading}
                icon={variant === "danger" ? <FaTrash aria-hidden="true" /> : undefined}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
