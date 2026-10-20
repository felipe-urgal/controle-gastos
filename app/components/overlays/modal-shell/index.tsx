'use client';

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { FaTimes } from 'react-icons/fa';

import { useModalFocus } from '@/app/hooks/use-modal-focus';

let scrollLocks = 0;
let scrollLockPrevious = '';

/** Trava o scroll do body com contador, para suportar overlays empilhados. */
export function lockBodyScroll() {
  if (scrollLocks === 0) {
    scrollLockPrevious = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;

  return () => {
    scrollLocks -= 1;
    if (scrollLocks === 0) document.body.style.overflow = scrollLockPrevious;
  };
}

export function ModalShell({
  title,
  children,
  onClose,
  closeDisabled = false,
  maxWidthClass = 'max-w-xl',
  footer,
  hideBottomNav = true,
  description,
  closeLabel = 'Fechar',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  maxWidthClass?: string;
  /** Nome acessível do botão de fechar. */
  closeLabel?: string;
  /** Texto de apoio sob o título; vira `aria-describedby` do diálogo. */
  description?: string;
  /** Ações fixas no rodapé; ficam sempre visíveis ao rolar o conteúdo. */
  footer?: ReactNode;
  /** Oculta a bottom-nav do shell enquanto o overlay está aberto (mobile). */
  hideBottomNav?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const close = useCallback(() => {
    if (!closeDisabled) onCloseRef.current();
  }, [closeDisabled]);

  const dialogRef = useModalFocus<HTMLElement>(true, close, closeDisabled);

  useEffect(() => lockBodyScroll(), []);

  return (
    <div
      data-overlay-hide-nav={hideBottomNav || undefined}
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center overflow-y-auto bg-[var(--overlay)] px-3 pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:p-5"
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
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={closeDisabled || undefined}
        className={`w-full ${maxWidthClass} max-h-[calc(100dvh-max(1rem,env(safe-area-inset-top)))] flex flex-col overflow-y-auto overscroll-contain rounded-t-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-elevated)] outline-none sm:rounded-[22px]`}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-xl font-extrabold text-[var(--foreground)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={closeDisabled}
            aria-label={closeLabel}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-45"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        {description && (
          <p id={descriptionId} className="-mt-3 mb-5 text-sm leading-relaxed text-[var(--text-muted)]">
            {description}
          </p>
        )}
        {children}
        {footer && (
          <div className="sticky bottom-[calc(-1.25rem-env(safe-area-inset-bottom))] -mx-5 mt-5 border-t border-[var(--border)] bg-[var(--surface)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            {footer}
          </div>
        )}
      </section>
    </div>
  );
}
