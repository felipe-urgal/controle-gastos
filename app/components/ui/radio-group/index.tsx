'use client';

import React from 'react';

interface RadioOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface RadioGroupProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  disabled?: boolean;
  name: string;
  required?: boolean;
  size?: 'default' | 'compact';
  className?: string;
}

export default function RadioGroup({
  label,
  value,
  onChange,
  options,
  disabled = false,
  name,
  size = 'compact',
  required,
  className = '',
}: RadioGroupProps) {
  const isCompact = size === 'compact';

  return (
    <fieldset className={`flex w-full flex-col ${className}`} disabled={disabled}>
      {label && (
        <legend className="ds-label mb-2">
          {label}
          {required && (
            <span className="ml-1 text-[var(--expense)]" aria-hidden="true">
              *
            </span>
          )}
        </legend>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              className={`
                relative flex min-h-11 w-auto cursor-pointer items-center justify-center
                rounded-[var(--radius-md)] border font-medium
                transition-[background-color,border-color,color,box-shadow] duration-150
                focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]
                ${isCompact ? 'px-3.5 py-2 text-sm' : 'px-4 py-3 text-base'}
                ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--foreground)]'
                    : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                }
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                required={required}
                className="sr-only"
              />

              <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                {option.icon && (
                  <span
                    className={
                      isSelected
                        ? 'text-[var(--primary)]'
                        : 'text-[var(--text-subtle)]'
                    }
                    aria-hidden="true"
                  >
                    {option.icon}
                  </span>
                )}
                <span>{option.label}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
