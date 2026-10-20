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

export type ModalShellVariant = 'sheet' | 'fullscreen-sheet';

export function ModalShell({
  title,
  children,
  onClose,
  closeDisabled = false,
  maxWidthClass = 'max-w-xl',
  footer,
  hideBottomNav = true,
  description,
  eyebrow,
  closeLabel = 'Fechar',
  variant = 'sheet',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  maxWidthClass?: string;
  /** Ações fixas no rodapé; ficam sempre visíveis enquanto o corpo rola. */
  footer?: ReactNode;
  /** Oculta a bottom-nav do shell enquanto o overlay está aberto (mobile). */
  hideBottomNav?: boolean;
  /** Texto de apoio sob o título; vira `aria-describedby` do diálogo. */
  description?: string;
  /** Rótulo curto acima do título. */
  eyebrow?: string;
  /** Nome acessível do botão de fechar. */
  closeLabel?: string;
  /**
   * `sheet`: folha na base no mobile. `fullscreen-sheet`: ocupa a área útil
   * abaixo da topbar em telas pequenas (filtros, período, formulários longos).
   * Em ≥ sm ambos viram diálogo centralizado.
   */
  variant?: ModalShellVariant;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  const fullscreen = variant === 'fullscreen-sheet';

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const close = useCallback(() => {
    if (!closeDisabled) onCloseRef.current();
  }, [closeDisabled]);

  const dialogRef = useModalFocus<HTMLElement>(true, close, closeDisabled);

  useEffect(() => lockBodyScroll(), []);

  const topInset = fullscreen
    ? 'max-sm:pt-[calc(var(--app-mobile-topbar-height)+env(safe-area-inset-top))]'
    : 'pt-[max(1rem,env(safe-area-inset-top))]';
  const sectionSize = fullscreen
    ? 'max-sm:h-full max-sm:rounded-none sm:max-h-[min(88dvh,820px)]'
    : 'max-h-[calc(100dvh-max(1rem,env(safe-area-inset-top)))]';

  return (
    <div
      data-overlay-hide-nav={hideBottomNav || undefined}
      className={`fixed inset-0 z-[var(--z-modal)] flex ${fullscreen ? 'items-stretch' : 'items-end'} justify-center bg-[var(--overlay)] ${fullscreen ? 'px-0' : 'px-3'} ${topInset} sm:items-center sm:p-5`}
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
        className={`flex w-full ${maxWidthClass} ${sectionSize} flex-col overflow-hidden rounded-t-[22px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)] outline-none sm:rounded-[22px]`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-5 pt-5">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--orbit-primary)]">
                {eyebrow}
              </p>
            )}
            <h2 id={titleId} className="text-xl font-extrabold text-[var(--foreground)]">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            disabled={closeDisabled}
            aria-label={closeLabel}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-45"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </header>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 ${footer ? 'pb-5' : 'pb-[calc(1.25rem+env(safe-area-inset-bottom))]'}`}
        >
          {children}
        </div>
        {footer && (
          <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}
