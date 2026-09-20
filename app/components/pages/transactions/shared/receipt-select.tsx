'use client';

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FaCheck } from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';

export type ReceiptSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  color?: string | null;
  icon?: string | null;
};

export type ReceiptSelectGroup = {
  label: string;
  options: ReceiptSelectOption[];
};

type ReceiptSelectProps = {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options?: ReceiptSelectOption[];
  groups?: ReceiptSelectGroup[];
  disabled?: boolean;
  children: ReactNode;
  triggerClassName: string;
  menuClassName?: string;
};

export default function ReceiptSelect({
  ariaLabel,
  value,
  onChange,
  options = [],
  groups = [],
  disabled = false,
  children,
  triggerClassName,
  menuClassName = '',
}: ReceiptSelectProps) {
  const id = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const flatOptions = useMemo(
    () => (groups.length ? groups.flatMap((group) => group.options) : options),
    [groups, options],
  );

  useEffect(() => {
    if (!open) return;

    const selectedIndex = flatOptions.findIndex(
      (option) => option.value === value && !option.disabled,
    );
    const firstEnabledIndex = flatOptions.findIndex((option) => !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex);

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [flatOptions, open, value]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const item = menuRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    item?.focus();
  }, [activeIndex, open]);

  const nextEnabledIndex = (start: number, direction: 1 | -1) => {
    if (!flatOptions.length) return -1;
    let index = start;

    for (let attempts = 0; attempts < flatOptions.length; attempts += 1) {
      index = (index + direction + flatOptions.length) % flatOptions.length;
      if (!flatOptions[index]?.disabled) return index;
    }

    return -1;
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const selectedIndex = flatOptions.findIndex(
        (option) => option.value === value && !option.disabled,
      );
      const base = selectedIndex >= 0 ? selectedIndex : event.key === 'ArrowDown' ? -1 : 0;
      setActiveIndex(nextEnabledIndex(base, event.key === 'ArrowDown' ? 1 : -1));
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>('[data-receipt-select-trigger]')?.focus();
      return;
    }

    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        nextEnabledIndex(current, event.key === 'ArrowDown' ? 1 : -1),
      );
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(flatOptions.findIndex((option) => !option.disabled));
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      for (let index = flatOptions.length - 1; index >= 0; index -= 1) {
        if (!flatOptions[index]?.disabled) {
          setActiveIndex(index);
          break;
        }
      }
    }
  };

  const selectOption = (option: ReceiptSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLButtonElement>('[data-receipt-select-trigger]')?.focus();
    });
  };

  const renderOption = (option: ReceiptSelectOption, index: number) => {
    const selected = option.value === value;

    return (
      <button
        key={option.value}
        type="button"
        role="option"
        aria-selected={selected}
        disabled={option.disabled}
        data-option-index={index}
        tabIndex={activeIndex === index ? 0 : -1}
        onClick={() => selectOption(option)}
        className={`flex min-h-10 w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
          selected
            ? 'bg-[var(--orbit-primary-subtle)] text-[var(--foreground)]'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus:bg-[var(--surface-hover)] focus:text-[var(--foreground)]'
        }`}
      >
        {(option.color || option.icon) && (
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white"
            style={{ backgroundColor: option.color || 'var(--orbit-primary)' }}
            aria-hidden="true"
          >
            <IconRenderer iconName={option.icon || 'tag'} size={12} />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {selected && <FaCheck className="shrink-0 text-xs text-[var(--orbit-primary)]" aria-hidden="true" />}
      </button>
    );
  };

  let optionIndex = 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-receipt-select-trigger
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `receipt-select-${id}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className={triggerClassName}
      >
        {children}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={`receipt-select-${id}`}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleMenuKeyDown}
          className={`absolute left-0 right-0 z-[70] mt-1 max-h-[280px] overflow-y-auto rounded-[12px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-surface)] [scrollbar-width:thin] ${menuClassName}`}
        >
          {groups.length
            ? groups.map((group) => (
                <div key={group.label} className="py-1">
                  <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                    {group.label}
                  </p>
                  {group.options.map((option) => {
                    const currentIndex = optionIndex;
                    optionIndex += 1;
                    return renderOption(option, currentIndex);
                  })}
                </div>
              ))
            : options.map((option, index) => renderOption(option, index))}
        </div>
      )}
    </div>
  );
}
