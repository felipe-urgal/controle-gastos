'use client';

import { ReactNode, useEffect, useRef } from 'react';

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
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!error) return;

    const frame = window.requestAnimationFrame(() => {
      const invalidField = document.querySelector('[aria-invalid="true"]');
      if (invalidField instanceof HTMLElement) return;

      errorRef.current?.focus({ preventScroll: true });
      errorRef.current?.scrollIntoView({ block: 'nearest' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [error]);

  return (
    <form
      onSubmit={onSubmit}
      className={`ds-panel relative flex flex-col gap-4 p-5 sm:p-6 ${className}`}
    >
      {error && (
        <div ref={errorRef} tabIndex={-1} className="rounded-[var(--radius-md)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
          <Alert variant="error" message={error} onClose={onClearError} />
        </div>
      )}
      {children}
    </form>
  );
}
