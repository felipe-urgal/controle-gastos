'use client';

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { FaCheck } from 'react-icons/fa';

import IconRenderer from '@/app/components/ui/icon-renderer';

export type ListboxSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  color?: string | null;
  icon?: string | null;
};

export type ListboxSelectGroup = {
  label: string;
  options: ListboxSelectOption[];
};

type ListboxSelectProps = {
  /** `id` do gatilho (para um `<label htmlFor>`). */
  id?: string;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options?: ListboxSelectOption[];
  groups?: ListboxSelectGroup[];
  disabled?: boolean;
  /** O gatilho pode ler se o menu está aberto (ex.: girar a seta). */
  children: ReactNode | ((open: boolean) => ReactNode);
  triggerClassName: string;
  menuClassName?: string;
  /** Movimento: o menu se abre do gatilho, as opções entram em sequência e a marca de selecionada "estoura". */
  animated?: boolean;
};

/**
 * Select próprio (lista customizada, não a nativa): segue o tema, tem teclado completo e marca a
 * opção atual. O gatilho é livre (`children` + `triggerClassName`) para cada tela desenhar o seu.
 */
export default function ListboxSelect({
  id: triggerId,
  ariaLabel,
  value,
  onChange,
  options = [],
  groups = [],
  disabled = false,
  children,
  triggerClassName,
  menuClassName = '',
  animated = false,
}: ListboxSelectProps) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Posição do menu na janela: ele é desenhado fora do contêiner (portal) para não ser cortado por modais ou áreas com rolagem.
  const [place, setPlace] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number; above: boolean } | null>(null);

  const flatOptions = useMemo(
    () => (groups.length ? groups.flatMap((group) => group.options) : options),
    [groups, options],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Mede o gatilho e posiciona o menu abaixo dele; sem espaço embaixo (e com mais em cima) o menu abre para cima.
  useLayoutEffect(() => {
    if (!open) return;

    const measure = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 4;
      const margin = 12;
      const below = window.innerHeight - rect.bottom - gap - margin;
      const above = rect.top - gap - margin;
      const above_ = below < 220 && above > below;
      const maxHeight = Math.max(120, Math.min(280, above_ ? above : below));
      setPlace(
        above_
          ? { bottom: window.innerHeight - (rect.top - gap), left: rect.left, width: rect.width, maxHeight, above: true }
          : { top: rect.bottom + gap, left: rect.left, width: rect.width, maxHeight, above: false },
      );
    };

    measure();
    window.addEventListener('resize', measure);
    // `true`: acompanha também a rolagem de contêineres internos (o corpo do modal), não só a da página.
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const item = menuRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    item?.focus();
  }, [activeIndex, open]);

  const initialActiveIndex = () => {
    const selectedIndex = flatOptions.findIndex(
      (option) => option.value === value && !option.disabled,
    );
    if (selectedIndex >= 0) return selectedIndex;
    return flatOptions.findIndex((option) => !option.disabled);
  };

  const openMenu = () => {
    setActiveIndex(initialActiveIndex());
    setOpen(true);
  };

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
      const selectedIndex = initialActiveIndex();
      const base = selectedIndex >= 0 ? selectedIndex : event.key === 'ArrowDown' ? -1 : 0;
      setActiveIndex(nextEnabledIndex(base, event.key === 'ArrowDown' ? 1 : -1));
      setOpen(true);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>('[data-listbox-select-trigger]')?.focus();
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

  const selectOption = (option: ListboxSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    requestAnimationFrame(() => {
      rootRef.current?.querySelector<HTMLButtonElement>('[data-listbox-select-trigger]')?.focus();
    });
  };

  const renderOption = (option: ListboxSelectOption, index: number) => {
    const selected = option.value === value;

    return (
      <motion.button
        key={option.value}
        type="button"
        role="option"
        aria-selected={selected}
        disabled={option.disabled}
        data-option-index={index}
        tabIndex={activeIndex === index ? 0 : -1}
        onClick={() => selectOption(option)}
        {...(animated
          ? {
              initial: reduce ? false : { opacity: 0, x: -14 },
              animate: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 26, delay: 0.04 + Math.min(index, 8) * 0.035 } },
              whileHover: option.disabled ? undefined : { x: 4, transition: { type: 'spring' as const, stiffness: 400, damping: 22 } },
              whileTap: option.disabled ? undefined : { scale: 0.97 },
            }
          : {})}
        className={`flex min-h-10 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
          selected
            ? 'bg-[var(--primary-subtle)] text-[var(--foreground)]'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus:bg-[var(--surface-hover)] focus:text-[var(--foreground)]'
        }`}
      >
        {(option.color || option.icon) && (
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white"
            style={{ backgroundColor: option.color || 'var(--primary)' }}
            aria-hidden="true"
          >
            <IconRenderer iconName={option.icon || 'tag'} size={12} />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {selected &&
          (animated ? (
            <motion.span
              className="flex shrink-0"
              initial={reduce ? false : { scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.15 }}
            >
              <FaCheck className="text-xs text-[var(--primary)]" aria-hidden="true" />
            </motion.span>
          ) : (
            <FaCheck className="shrink-0 text-xs text-[var(--primary)]" aria-hidden="true" />
          ))}
      </motion.button>
    );
  };

  let optionIndex = 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={triggerId}
        data-listbox-select-trigger
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `listbox-select-${id}` : undefined}
        disabled={disabled}
        onClick={() => {
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={handleTriggerKeyDown}
        className={triggerClassName}
      >
        {typeof children === 'function' ? children(open) : children}
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
      <AnimatePresence>
      {open && place && (
        <motion.div
          ref={menuRef}
          {...(animated
            ? {
                initial: reduce ? false : { opacity: 0, scaleY: 0.7, y: -10 },
                animate: { opacity: 1, scaleY: 1, y: 0 },
                exit: { opacity: 0, scaleY: 0.85, y: -6, transition: { duration: 0.12 } },
                transition: { type: 'spring' as const, stiffness: 420, damping: 30 },
              }
            : {})}
          style={{
            top: place.top,
            bottom: place.bottom,
            left: place.left,
            width: place.width,
            maxHeight: place.maxHeight,
            transformOrigin: place.above ? 'bottom' : 'top',
            // Acima do modal (que fica em --z-modal): o menu sai do contêiner e não pode ficar por baixo dele.
            zIndex: 'calc(var(--z-modal) + 10)',
          }}
          id={`listbox-select-${id}`}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleMenuKeyDown}
          className={`fixed overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-surface)] [scrollbar-width:thin] ${menuClassName}`}
        >
          {groups.length
            ? groups.map((group) => (
                <div key={group.label} className="py-1">
                  {group.label && (
                    <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                      {group.label}
                    </p>
                  )}
                  {group.options.map((option) => {
                    const currentIndex = optionIndex;
                    optionIndex += 1;
                    return renderOption(option, currentIndex);
                  })}
                </div>
              ))
            : options.map((option, index) => renderOption(option, index))}
        </motion.div>
      )}
      </AnimatePresence>
        , document.body)}
    </div>
  );
}
