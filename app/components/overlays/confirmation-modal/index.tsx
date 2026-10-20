'use client';

import type { ReactNode } from 'react';
import {
  FaBan,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTrash,
} from 'react-icons/fa';

import { ModalShell } from '@/app/components/overlays/modal-shell';
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
  children?: ReactNode;
  dangerNotice?: string | null;
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
  children,
  dangerNotice = 'Esta ação é irreversível e removerá permanentemente todos os dados associados.',
}: ConfirmationModalProps) {
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

  return (
    <ModalShell
      title={title}
      description={message}
      icon={
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] border ${config.iconBackground} ${config.iconBorder}`}
        >
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </span>
      }
      onClose={onClose}
      closeDisabled={isLoading}
      maxWidthClass="max-w-md"
      footer={
        <div
          className={`flex flex-col-reverse gap-2 sm:flex-row ${
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
      }
    >
      {children && <div className="space-y-3">{children}</div>}

      {variant === 'danger' && dangerNotice && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] p-3.5">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-[var(--expense)]">
            <FaBan className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{dangerNotice}</span>
          </p>
        </div>
      )}
    </ModalShell>
  );
}
