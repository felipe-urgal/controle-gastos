'use client';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { IconButton } from '@/app/components/ui/icon-button';
import { monthNames } from '@/app/lib/date/constants';

const surface = 'border border-[var(--border)] bg-[var(--surface)]';

/**
 * Seletor de período padrão: anterior, "Mês / Ano" e próximo, tudo com 44px de altura. O período
 * muda só pelos botões; o rótulo é texto, sem clique.
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
}) {
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
