'use client';

interface ActiveToggleProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  disabled?: boolean;
  label?: string;
  activeLabel?: string;
  inactiveLabel?: string;
  /** `switch`: só o interruptor (o rótulo fica acessível, mas oculto), para linhas de configuração. */
  appearance?: 'bar' | 'switch';
}

export default function ActiveToggle({
  isActive,
  onToggle,
  disabled = false,
  label = 'Item ativo',
  activeLabel = 'Ativo',
  inactiveLabel = 'Inativo',
  appearance = 'bar',
}: ActiveToggleProps) {
  if (appearance === 'switch') {
    return (
      <label className={`relative inline-flex min-h-11 items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          role="switch"
          checked={isActive}
          onChange={(event) => onToggle(event.target.checked)}
          className="peer sr-only"
          disabled={disabled}
          aria-label={label}
        />
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] ${isActive ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border-strong)] bg-[var(--surface-subtle)]'}`}
          aria-hidden="true"
        >
          <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-sm transition-[left] duration-150 ${isActive ? 'left-[24px] bg-[var(--on-primary)]' : 'left-[3px] bg-[var(--text-muted)]'}`} />
        </span>
        <span className="sr-only">{isActive ? activeLabel : inactiveLabel}</span>
      </label>
    );
  }

  return (
    <label
      className={`
        flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] border
        border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5
        transition-[background-color,border-color,box-shadow] duration-150
        focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]'}
      `}
    >
      <input
        type="checkbox"
        checked={isActive}
        onChange={(event) => onToggle(event.target.checked)}
        className="peer sr-only"
        disabled={disabled}
      />

      <span
        className={`
          relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150
          ${
            isActive
              ? 'border-[var(--primary)] bg-[var(--primary)]'
              : 'border-[var(--border-strong)] bg-[var(--surface-subtle)]'
          }
        `}
        aria-hidden="true"
      >
        <span
          className={`
            absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full shadow-sm
            transition-[left,background-color] duration-150
            ${
              isActive
                ? 'left-[22px] bg-[var(--on-primary)]'
                : 'left-[3px] bg-[var(--text-muted)]'
            }
          `}
        />
      </span>

      <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--foreground)]">
        {label}
      </span>

      <span
        className={`text-sm font-medium ${
          isActive ? 'text-[var(--income)]' : 'text-[var(--text-muted)]'
        }`}
      >
        {isActive ? activeLabel : inactiveLabel}
      </span>
    </label>
  );
}
