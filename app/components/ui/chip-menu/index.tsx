'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronDown } from 'react-icons/fa';

export type ChipMenuItem = { key: string; label: string; onSelect: () => void };

/**
 * Chip que abre um menu pequeno de opções. Feito para viver dentro de uma linha clicável (link):
 * os cliques não propagam e não navegam. Fecha ao escolher, ao clicar fora, ao rolar e com Esc.
 * O menu vai para o `body` (posição fixa): as linhas animadas criam contextos de empilhamento próprios
 * e um menu absoluto ficaria por baixo das linhas seguintes.
 */
export function ChipMenu({
  content,
  ariaLabel,
  items,
  toneClass,
  disabled = false,
  error = null,
}: {
  content: ReactNode;
  ariaLabel: string;
  items: ChipMenuItem[];
  /** Cores do chip (borda, fundo e texto). */
  toneClass: string;
  disabled?: boolean;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLSpanElement>(null);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const right = Math.max(8, window.innerWidth - rect.right);
    // Perto do rodapé o menu abre para cima.
    const opensUp = window.innerHeight - rect.bottom < items.length * 40 + 24 && rect.top > window.innerHeight / 2;
    setPosition(
      opensUp
        ? { bottom: window.innerHeight - rect.top + 4, right }
        : { top: rect.bottom + 4, right },
    );
  }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function swallow(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <span ref={rootRef} className="relative inline-flex flex-col items-end" onClick={swallow}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={(event) => {
          swallow(event);
          if (!open) place();
          setOpen((value) => !value);
        }}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-60 ${
          error ? 'border-[var(--expense)]/40 bg-[var(--danger-subtle)] text-[var(--expense)]' : toneClass
        }`}
      >
        {content}
        <FaChevronDown aria-hidden="true" className="text-xs" />
      </button>
      {open && position && createPortal(
        <span
          ref={menuRef}
          role="menu"
          style={position}
          className="fixed z-[var(--z-popover)] grid min-w-[10.5rem] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1 text-left shadow-[var(--shadow-surface)]"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={(event) => {
                swallow(event);
                setOpen(false);
                item.onSelect();
              }}
              className="min-h-10 rounded-[var(--radius-sm)] px-3 text-left text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
            >
              {item.label}
            </button>
          ))}
        </span>
      ,
        document.body,
      )}
      {error && <span role="alert" className="mt-1 max-w-[12rem] text-right text-xs text-[var(--expense)]">{error}</span>}
    </span>
  );
}
