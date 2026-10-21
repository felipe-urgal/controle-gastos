'use client';

import { useState, type ReactNode } from 'react';

import ConfirmationModal from '@/app/components/overlays/confirmation-modal';

interface ConfirmationRequest {
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

/** Substitui `window.confirm` pelo `ConfirmationModal` comum: `confirm(...)` abre, `modal` deve ser renderizado. */
export function usePayrollConfirmation(): {
  confirm: (request: ConfirmationRequest) => void;
  modal: ReactNode;
} {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);

  return {
    confirm: setRequest,
    modal: (
      <ConfirmationModal
        isOpen={request !== null}
        onClose={() => setRequest(null)}
        onConfirm={() => {
          const current = request;
          setRequest(null);
          if (current) void current.onConfirm();
        }}
        title={request?.title}
        message={request?.message}
        confirmText={request?.confirmText ?? 'Confirmar'}
        variant={request?.variant ?? 'warning'}
        dangerNotice={null}
      />
    ),
  };
}
