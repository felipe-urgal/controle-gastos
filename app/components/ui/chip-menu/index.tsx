'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';

export type ChipMenuItem = { key: string; label: string; onSelect: () => void };

/**
 * Chip que abre um menu pequeno de opções. Feito para viver dentro de uma linha clicável (link):
 * os cliques não propagam e não navegam. Fecha ao escolher, ao clicar fora e com Esc.
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
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function swallow(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <span ref={rootRef} className="relative inline-flex flex-col items-end" onClick={swallow}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={(event) => {
          swallow(event);
          setOpen((value) => !value);
        }}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-60 ${
          error ? 'border-[var(--expense)]/40 bg-[var(--danger-subtle)] text-[var(--expense)]' : toneClass
        }`}
      >
        {content}
        <FaChevronDown aria-hidden="true" className="text-xs" />
      </button>
      {open && (
        <span
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-[var(--z-popover)] grid min-w-[10.5rem] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1 text-left shadow-[var(--shadow-surface)]"
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
      )}
      {error && <span role="alert" className="mt-1 max-w-[12rem] text-right text-xs text-[var(--expense)]">{error}</span>}
    </span>
  );
}
