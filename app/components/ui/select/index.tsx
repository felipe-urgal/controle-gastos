'use client';

import { useId } from 'react';
import { FaChevronDown } from 'react-icons/fa';

type Option = {
  value: string | number;
  label: string;
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
};

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
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId.replace(/:/g, '')}`;

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
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}

        <select
          id={selectId}
          aria-label={
            label ? undefined : ariaLabel ?? placeholder ?? 'Selecionar opção'
          }
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          className={`
            ds-control appearance-none px-3.5 pr-10
            ${icon ? 'pl-10' : ''}
          `}
        >
          {placeholder && <option value="">{placeholder}</option>}

          {grouped
            ? (options as Group[]).map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : (options as Option[]).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
        </select>

        <FaChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
