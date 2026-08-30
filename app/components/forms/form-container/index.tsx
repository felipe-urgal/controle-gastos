'use client';

import { ReactNode } from 'react';

import { Alert } from '@/app/components/feedback';

interface FormContainerProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  error?: string | null;
  onClearError?: () => void;
  className?: string;
}

export default function FormContainer({
  children,
  onSubmit,
  error,
  onClearError,
  className = '',
}: FormContainerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={`ds-panel relative flex flex-col gap-4 p-5 sm:p-6 ${className}`}
    >
      {error && <Alert variant="error" message={error} onClose={onClearError} />}
      {children}
    </form>
  );
}
