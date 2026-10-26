'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { IconButton } from '@/app/components/ui/icon-button';
import { monthNames } from '@/app/lib/date/constants';

const surface = 'border border-[var(--border)] bg-[var(--surface)]';

/**
 * Seletor de período padrão: anterior, "Mês / Ano" e próximo, tudo com 44px de altura. O período
 * muda só pelos botões; o rótulo é texto, sem clique. Com `animated`, o rótulo desliza na direção do
 * clique e os botões dão um pequeno empurrão.
 */
export default function PeriodSwitcher({
  month,
  year,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
  disabled = false,
  className = '',
  animated = false,
}: {
  /** Mês de 1 a 12. */
  month: number;
  year: number;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  disabled?: boolean;
  className?: string;
  animated?: boolean;
}) {
  // Direção do último clique: -1 volta no tempo, 1 avança. Muda no mesmo lote da troca de período.
  const [direction, setDirection] = useState(1);
  const label = `${monthNames[month - 1] ?? ''} / ${year}`;
  const previous = () => {
    setDirection(-1);
    onPrevious();
  };
  const next = () => {
    setDirection(1);
    onNext();
  };

  if (animated) {
    return (
      <div className={`flex min-w-0 items-center gap-2 ${className}`} role="group" aria-label="Período">
        <motion.div whileTap={{ x: -3 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }} className="flex">
          <IconButton
            label="Mês anterior"
            icon={<FaChevronLeft />}
            onClick={previous}
            disabled={disabled || previousDisabled}
            className={surface}
          />
        </motion.div>

        <output
          className={`relative inline-flex min-h-11 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[var(--radius-md)] px-3 text-center text-sm font-semibold text-[var(--foreground)] sm:min-w-[11rem] sm:flex-none ${surface}`}
        >
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.span
              key={label}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ x: dir * 28, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir: number) => ({ x: dir * -28, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              className="truncate"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </output>

        <motion.div whileTap={{ x: 3 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }} className="flex">
          <IconButton
            label="Próximo mês"
            icon={<FaChevronRight />}
            onClick={next}
            disabled={disabled || nextDisabled}
            className={surface}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`} role="group" aria-label="Período">
      <IconButton
        label="Mês anterior"
        icon={<FaChevronLeft />}
        onClick={onPrevious}
        disabled={disabled || previousDisabled}
        className={surface}
      />

      <output
        className={`inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-[var(--radius-md)] px-3 text-center text-sm font-semibold text-[var(--foreground)] sm:min-w-[11rem] sm:flex-none ${surface}`}
      >
        <span className="truncate">
          {monthNames[month - 1] ?? ''} / {year}
        </span>
      </output>

      <IconButton
        label="Próximo mês"
        icon={<FaChevronRight />}
        onClick={onNext}
        disabled={disabled || nextDisabled}
        className={surface}
      />
    </div>
  );
}
