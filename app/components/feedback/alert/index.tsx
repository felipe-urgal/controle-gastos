'use client';

import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
} from 'react-icons/fa';

interface AlertProps {
  variant: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose?: () => void;
}

export default function Alert({ variant, message, onClose }: AlertProps) {
  const variants = {
    success: {
      background: 'bg-[var(--primary-subtle)]',
      border: 'border-[var(--primary)]/40',
      color: 'text-[var(--income)]',
      icon: FaCheckCircle,
    },
    error: {
      background: 'bg-[var(--danger-subtle)]',
      border: 'border-[var(--danger)]/50',
      color: 'text-[var(--expense)]',
      icon: FaExclamationTriangle,
    },
    warning: {
      background: 'bg-[var(--warning-subtle)]',
      border: 'border-[var(--warning)]/50',
      color: 'text-[var(--pending)]',
      icon: FaExclamationTriangle,
    },
    info: {
      background: 'bg-[var(--info-subtle)]',
      border: 'border-[var(--info)]/50',
      color: 'text-[var(--foreground)]',
      icon: FaInfoCircle,
    },
  } as const;

  const style = variants[variant];
  const Icon = style.icon;

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-[var(--radius-md)] border p-4 ${style.background} ${style.border}`}
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon className={`mt-0.5 shrink-0 ${style.color}`} aria-hidden="true" />
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{message}</p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar mensagem"
          className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
        >
          <FaTimes aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
