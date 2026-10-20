'use client';

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
  children: ReactNode;
}

/** Pílula de filtro/aba (botão alternável, 44px de altura de toque). */
export function Chip({ selected = false, className = '', children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
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
