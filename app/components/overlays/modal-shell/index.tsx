'use client';

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { FaTimes } from 'react-icons/fa';

import { useModalFocus } from '@/app/hooks/use-modal-focus';

export function ModalShell({
  title,
  children,
  onClose,
  closeDisabled = false,
  maxWidthClass = 'max-w-xl',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  maxWidthClass?: string;
}) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const close = useCallback(() => {
    if (!closeDisabled) onCloseRef.current();
  }, [closeDisabled]);

  const dialogRef = useModalFocus<HTMLElement>(true, close, closeDisabled);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-[var(--overlay)] px-3 pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={closeDisabled || undefined}
        className={`w-full ${maxWidthClass} max-h-[calc(100dvh-max(1rem,env(safe-area-inset-top)))] overflow-y-auto rounded-t-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-elevated)] outline-none sm:rounded-[22px]`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xl font-extrabold text-[var(--foreground)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={closeDisabled}
            aria-label="Fechar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-45"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
