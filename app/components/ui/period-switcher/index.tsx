'use client';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { IconButton } from '@/app/components/ui/icon-button';

const surface = 'border border-[var(--border)] bg-[var(--surface)]';
const center =
  'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 text-center text-sm font-semibold text-[var(--foreground)] sm:min-w-[11rem] sm:flex-none ' +
  surface;

/**
 * Seletor de período (mês/ano) padrão: anterior, rótulo e próximo, tudo com 44px de altura.
 * O rótulo pode abrir um seletor (`onOpen`), escolher o mês pelo campo nativo (`monthInput`),
 * disparar uma ação (`onCenterClick`, ex.: ir para hoje) ou ser só texto.
 */
export default function PeriodSwitcher({
  label,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
  disabled = false,
  onOpen,
  expanded,
  monthInput,
  onCenterClick,
  className = '',
}: {
  /** Período exibido (ex.: "Outubro de 2026"). */
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  disabled?: boolean;
  /** O rótulo abre um diálogo de escolha de período. */
  onOpen?: () => void;
  expanded?: boolean;
  /** O rótulo escolhe o mês pelo campo nativo (`YYYY-MM`). */
  monthInput?: { value: string; onChange: (value: string) => void; min?: string; max?: string };
  /** O rótulo é um botão de ação simples (sem diálogo). */
  onCenterClick?: () => void;
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

      {monthInput ? (
        <label title="Escolher mês" className={`${center} relative cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]`}>
          <span className="truncate capitalize">{label}</span>
          <span className="sr-only">Escolher mês</span>
          <input
            type="month"
            value={monthInput.value}
            min={monthInput.min}
            max={monthInput.max}
            disabled={disabled}
            onChange={(event) => event.currentTarget.value && monthInput.onChange(event.currentTarget.value)}
            // No Chrome o campo só abre o calendário pelo ícone nativo; o clique no rótulo abre direto.
            onClick={(event) => {
              try {
                event.currentTarget.showPicker?.();
              } catch {
                // Navegador sem showPicker ou sem gesto: o campo segue editável pelo teclado.
              }
            }}
            className="absolute -inset-px cursor-pointer opacity-0"
          />
        </label>
      ) : onOpen || onCenterClick ? (
        <button
          type="button"
          onClick={onOpen ?? onCenterClick}
          disabled={disabled}
          aria-haspopup={onOpen ? 'dialog' : undefined}
          aria-expanded={onOpen ? expanded : undefined}
          className={`${center} transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-50`}
        >
          <span className="truncate capitalize">{label}</span>
        </button>
      ) : (
        <output className={center}>
          <span className="truncate capitalize">{label}</span>
        </output>
      )}

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
