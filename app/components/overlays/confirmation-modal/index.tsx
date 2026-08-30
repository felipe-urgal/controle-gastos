'use client';

import { KeyboardEvent, useEffect, useId, useRef } from 'react';
import {
  FaBan,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTrash,
} from 'react-icons/fa';

import { Button } from '@/app/components/ui';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  showCancelButton?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja realizar esta ação?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
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
      iconColor: 'text-[var(--expense)]',
      iconBackground: 'bg-[var(--danger-subtle)]',
      iconBorder: 'border-[var(--danger)]',
      buttonVariant: 'danger' as const,
    },
    warning: {
      icon: FaExclamationTriangle,
      iconColor: 'text-[var(--pending)]',
      iconBackground: 'bg-[var(--warning-subtle)]',
      iconBorder: 'border-[var(--warning)]',
      buttonVariant: 'warning' as const,
    },
    info: {
      icon: FaInfoCircle,
      iconColor: 'text-[var(--info)]',
      iconBackground: 'bg-[var(--info-subtle)]',
      iconBorder: 'border-[var(--info)]',
      buttonVariant: 'primary' as const,
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !isLoading) {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable?.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (activeElement === dialogRef.current) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[var(--overlay)]"
        onClick={isLoading ? undefined : onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-busy={isLoading || undefined}
          tabIndex={-1}
          className="ds-panel w-full max-w-md overflow-hidden"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border ${config.iconBackground} ${config.iconBorder}`}
                aria-hidden="true"
              >
                <Icon className={`h-5 w-5 ${config.iconColor}`} />
              </div>

              <h2 id={titleId} className="text-xl font-semibold text-[var(--foreground)]">
                {title}
              </h2>
            </div>

            <p
              id={descriptionId}
              className="mt-4 text-base leading-relaxed text-[var(--text-muted)]"
            >
              {message}
            </p>

            {variant === 'danger' && (
              <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] p-3.5">
                <p className="flex items-start gap-2 text-sm leading-relaxed text-[var(--expense)]">
                  <FaBan className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    Esta ação é irreversível e removerá permanentemente todos os dados associados.
                  </span>
                </p>
              </div>
            )}

            <div
              className={`mt-6 flex flex-col-reverse gap-2 sm:flex-row ${
                showCancelButton ? 'sm:justify-between' : 'sm:justify-end'
              }`}
            >
              {showCancelButton && (
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                  {cancelText}
                </Button>
              )}

              <Button
                variant={config.buttonVariant}
                onClick={onConfirm}
                isLoading={isLoading}
                disabled={isLoading}
                icon={variant === 'danger' ? <FaTrash /> : undefined}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
