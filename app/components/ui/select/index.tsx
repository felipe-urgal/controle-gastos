'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';
import { FaChevronDown } from 'react-icons/fa';

import ListboxSelect from '@/app/components/ui/listbox-select';

type Option = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

type Group = {
  label: string;
  options: Option[];
};

type SelectProps = {
  id?: string;
  label?: string;
  ariaLabel?: string;
  value?: string | number;
  onChange: (value: string | number) => void;
  options: Option[] | Group[];
  placeholder?: string;
  disabled?: boolean;
  grouped?: boolean;
  icon?: React.ReactNode;
  required?: boolean;
  /** Movimento do menu e do gatilho (ver `ListboxSelect`): seta que gira e rótulo que troca deslizando. Ligado por padrão. */
  animated?: boolean;
};

const asOption = (option: Option) => ({ ...option, value: String(option.value) });

/**
 * Select padrão: lista própria (`ListboxSelect`), que segue o tema e tem teclado completo. O valor
 * chega ao `onChange` como texto, como no `<select>` nativo.
 */
export default function Select({
  id,
  label,
  ariaLabel,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  grouped,
  icon,
  required,
  animated = true,
}: SelectProps) {
  const reduce = useReducedMotion();
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId.replace(/:/g, '')}`;
  const current = value === undefined || value === null ? '' : String(value);

  const placeholderOption = placeholder ? [{ value: '', label: placeholder }] : [];
  const groups = grouped
    ? [
        ...(placeholder ? [{ label: '', options: placeholderOption }] : []),
        ...(options as Group[]).map((group) => ({ label: group.label, options: group.options.map(asOption) })),
      ]
    : undefined;
  const flat = grouped ? (groups ?? []).flatMap((group) => group.options) : [...placeholderOption, ...(options as Option[]).map(asOption)];
  const selected = flat.find((option) => option.value === current);
  const showingPlaceholder = !selected || selected.value === '';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="ds-label mb-2 block">
          {label}
          {required && (
            <span className="ml-1 text-[var(--expense)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div
            className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}

        <ListboxSelect
          id={selectId}
          ariaLabel={ariaLabel ?? label ?? placeholder ?? 'Selecionar opção'}
          value={current}
          onChange={onChange}
          options={groups ? undefined : flat}
          groups={groups}
          disabled={disabled}
          animated={animated}
          triggerClassName={`ds-control flex w-full items-center justify-between gap-2 px-3.5 text-left ${icon ? 'pl-10' : ''}`}
        >
          {(open) =>
            animated ? (
              <>
                {/* Trocou a opção: o rótulo novo sobe e o antigo sai. */}
                <span className={`relative min-w-0 flex-1 overflow-hidden ${showingPlaceholder ? 'text-[var(--text-muted)]' : ''}`}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={selected?.label ?? ''}
                      className="block truncate"
                      initial={reduce ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    >
                      {selected?.label ?? ''}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <motion.span
                  className="flex shrink-0"
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                >
                  <FaChevronDown className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
                </motion.span>
              </>
            ) : (
              <>
                <span className={`truncate ${showingPlaceholder ? 'text-[var(--text-muted)]' : ''}`}>
                  {selected?.label ?? ''}
                </span>
                <FaChevronDown className="shrink-0 text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </>
            )
          }
        </ListboxSelect>

        {required && (
          // Mantém a validação nativa de campo obrigatório do formulário.
          <input
            tabIndex={-1}
            aria-hidden="true"
            required
            value={current}
            onChange={() => undefined}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0 opacity-0"
          />
        )}
      </div>
    </div>
  );
}
