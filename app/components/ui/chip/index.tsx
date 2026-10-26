'use client';

import { motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  selected?: boolean;
  /** Quando vários chips compartilham o mesmo id, o destaque do selecionado desliza de um para o outro. */
  layoutId?: string;
  children: ReactNode;
}

/** Pílula de filtro/aba (botão alternável, 44px de altura de toque). */
export function Chip({ selected = false, layoutId, className = '', children, ...props }: ChipProps) {
  const sliding = Boolean(layoutId) && selected;

  const button = (
    <button
      type="button"
      aria-pressed={selected}
      className={`relative isolate inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50 ${
        sliding
          ? 'border-transparent font-semibold text-[var(--primary)]'
          : selected
          ? 'border-[var(--primary)] bg-[var(--primary-subtle)] font-semibold text-[var(--primary)]'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
      } ${className}`}
      {...props}
    >
      {sliding && (
        <motion.span
          aria-hidden="true"
          layoutId={layoutId}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          className="absolute inset-0 -z-10 rounded-full border border-[var(--primary)] bg-[var(--primary-subtle)]"
        />
      )}
      {children}
    </button>
  );

  // Chips com destaque deslizante (`layoutId`) também "achatam" ao passar o mouse, como uma gota.
  if (!layoutId) return button;

  return (
    <motion.span
      className="inline-flex shrink-0"
      whileHover={{ scaleX: 1.06, scaleY: 0.94 }}
      whileTap={{ scaleX: 0.96, scaleY: 1.04 }}
      transition={{ type: 'spring', stiffness: 500, damping: 16 }}
    >
      {button}
    </motion.span>
  );
}

/**
 * Linha rolável de `Chip`s. Quando há mais itens do que cabem, as bordas ganham um
 * esmaecimento indicando que dá para rolar.
 */
export function ChipRow({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    setEdges({
      left: element.scrollLeft > 1,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    update();
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [update, children]);

  const mask =
    edges.left && edges.right
      ? '[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]'
      : edges.right
        ? '[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]'
        : edges.left
          ? '[mask-image:linear-gradient(to_right,transparent,black_24px)]'
          : '';

  return (
    <nav aria-label={label}>
      <div
        ref={ref}
        onScroll={update}
        className={`flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${mask} ${className}`}
      >
        {children}
      </div>
    </nav>
  );
}
