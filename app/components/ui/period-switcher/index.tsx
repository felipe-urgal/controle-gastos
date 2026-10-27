'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { IconButton } from '@/app/components/ui/icon-button';
import { monthNames } from '@/app/lib/date/constants';

const surface = 'border border-[var(--border)] bg-[var(--surface)]';

/** Rastro da seta: uma cópia sai na direção do botão e some, como se a seta tivesse sido disparada. */
function ArrowTrail({ direction }: { direction: -1 | 1 }) {
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-[var(--primary)]"
      initial={{ opacity: 0 }}
      variants={{ hover: { x: direction * 14, opacity: [0.7, 0], transition: { duration: 0.45, ease: 'easeOut' } } }}
    >
      {direction === -1 ? <FaChevronLeft /> : <FaChevronRight />}
    </motion.span>
  );
}

/**
 * Seletor de período padrão: anterior, "Mês / Ano" e próximo, tudo com 44px de altura. O período
 * muda só pelos botões; o rótulo é texto, sem clique. Com `animated`, o rótulo desliza na horizontal na
 * direção do clique (`true`), rola na vertical, como um odômetro (`'roll'`), ou vira como a folha de um calendário (`'flip'`).
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
  animated?: boolean | 'roll' | 'flip';
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
    const roll = animated === 'roll';
    const flip = animated === 'flip';
    const axis = roll ? 'y' : 'x';
    const distance = roll ? 20 : 28;
    // `flip`: o mês antigo cai para a frente e o novo vem de cima, girando em torno da borda de cima (rotateX).
    const variants = flip
      ? {
          enter: (dir: number) => ({ rotateX: dir * -85, y: dir * -8, opacity: 0 }),
          // Sai rápido e em curva de aceleração; o novo mês entra devagar, com uma mola mole que dá um balanço no fim.
          center: { rotateX: 0, y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 90, damping: 11, mass: 1.1 } },
          exit: (dir: number) => ({ rotateX: dir * 85, y: dir * 8, opacity: 0, transition: { duration: 0.28, ease: 'easeIn' as const } }),
        }
      : {
          enter: (dir: number) => ({ [axis]: dir * distance, opacity: 0 }),
          center: { [axis]: 0, opacity: 1 },
          exit: (dir: number) => ({ [axis]: dir * -distance, opacity: 0 }),
        };

    return (
      <div className={`flex min-w-0 items-center gap-2 ${className}`} role="group" aria-label="Período">
        <motion.div whileHover="hover" whileTap={roll || flip ? { scale: 0.88 } : { x: -3 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }} className="relative flex">
          <ArrowTrail direction={-1} />
          <IconButton
            label="Mês anterior"
            icon={<motion.span className="flex" variants={{ hover: { x: -3 } }}><FaChevronLeft /></motion.span>}
            onClick={previous}
            disabled={disabled || previousDisabled}
            className={surface}
          />
        </motion.div>

        <output
          style={flip ? { perspective: 400 } : undefined}
          className={`relative inline-flex min-h-11 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[var(--radius-md)] px-3 text-center text-sm font-semibold text-[var(--foreground)] sm:min-w-[11rem] sm:flex-none ${surface}`}
        >
          <AnimatePresence mode={flip ? 'wait' : 'popLayout'} initial={false} custom={direction}>
            <motion.span
              key={label}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={flip ? undefined : { type: 'spring', stiffness: 500, damping: 36 }}
              style={flip ? { transformOrigin: '50% 0%' } : undefined}
              className="truncate"
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </output>

        <motion.div whileHover="hover" whileTap={roll || flip ? { scale: 0.88 } : { x: 3 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }} className="relative flex">
          <ArrowTrail direction={1} />
          <IconButton
            label="Próximo mês"
            icon={<motion.span className="flex" variants={{ hover: { x: 3 } }}><FaChevronRight /></motion.span>}
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
