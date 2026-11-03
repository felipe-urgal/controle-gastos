'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { monthNames } from '@/app/lib/date/constants';

export const PERIOD_MIN_YEAR = 1900;
export const PERIOD_MAX_YEAR = 2200;

export type PeriodLimit = { month: number; year: number };

const key = (period: PeriodLimit) => period.year * 12 + period.month;

/**
 * Botão sobre o rótulo do período que abre uma grade de 12 meses com seletor de ano.
 * Meses depois de `maxPeriod` ficam desabilitados.
 */
export function PeriodPickerPopover({
  month,
  year,
  maxPeriod,
  disabled,
  onSelect,
}: {
  month: number;
  year: number;
  maxPeriod?: PeriodLimit;
  disabled: boolean;
  onSelect: (month: number, year: number) => void;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const maxYear = Math.min(PERIOD_MAX_YEAR, maxPeriod?.year ?? PERIOD_MAX_YEAR);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open) setViewYear(year);
    setOpen((value) => !value);
  }

  function choose(nextMonth: number) {
    setOpen(false);
    triggerRef.current?.focus();
    if (nextMonth !== month || viewYear !== year) onSelect(nextMonth, viewYear);
  }

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Escolher mês e ano"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
        className="absolute inset-0 z-10 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--surface-hover)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed"
      />
      {open && (
        <motion.div
          role="dialog"
          aria-label="Escolher mês e ano"
          initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute left-1/2 top-full z-[var(--z-popover)] mt-2 w-[17rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-surface)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Ano anterior"
              disabled={viewYear <= PERIOD_MIN_YEAR}
              onClick={() => setViewYear((value) => value - 1)}
              className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)] disabled:opacity-40"
            >
              <FaChevronLeft />
            </button>
            <strong className="text-sm" aria-live="polite">{viewYear}</strong>
            <button
              type="button"
              aria-label="Próximo ano"
              disabled={viewYear >= maxYear}
              onClick={() => setViewYear((value) => value + 1)}
              className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)] disabled:opacity-40"
            >
              <FaChevronRight />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {monthNames.map((name, index) => {
              const value = index + 1;
              const selected = value === month && viewYear === year;
              const blocked = maxPeriod !== undefined && key({ month: value, year: viewYear }) > key(maxPeriod);
              return (
                <button
                  key={name}
                  type="button"
                  disabled={blocked}
                  aria-pressed={selected}
                  aria-label={`${name} de ${viewYear}`}
                  onClick={() => choose(value)}
                  className={`h-10 rounded-[var(--radius-md)] text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
