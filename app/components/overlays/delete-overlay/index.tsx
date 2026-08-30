'use client';

import { FaSpinner } from 'react-icons/fa';

interface DeleteOverlayProps {
  isOpen: boolean;
  entityName: string;
  title?: string;
  description?: string;
}

export default function DeleteOverlay({
  isOpen,
  entityName,
  title,
  description,
}: DeleteOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
      <div
        className="ds-panel w-full max-w-sm p-6 text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="relative mx-auto mb-5 h-14 w-14" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--danger-subtle)]" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--danger)] border-t-transparent" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
          {title ?? `Excluindo ${entityName}`}
        </h2>

        <p className="mb-5 text-base leading-relaxed text-[var(--text-muted)]">
          {description ?? `Por favor, aguarde enquanto excluímos ${entityName}...`}
        </p>

        <div className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--text-muted)]">
          <FaSpinner className="animate-spin" aria-hidden="true" />
          <span>Processando</span>
        </div>
      </div>
    </div>
  );
}
