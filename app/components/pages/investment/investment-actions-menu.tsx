'use client';

import { useEffect, useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';

import { Button } from '@/app/components/ui';

export type ActionMenuItem = { label: string; onSelect: () => void; disabled?: boolean };

/** Menu "Mais" das ações secundárias da página; fecha ao escolher, ao clicar fora e com Esc. */
export function InvestmentActionsMenu({ items }: { items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        pill
        aria-haspopup="menu"
        aria-expanded={open}
        icon={<FaChevronDown aria-hidden="true" className="text-xs" />}
        onClick={() => setOpen((current) => !current)}
      >
        Mais
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-20 grid min-w-[13rem] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-surface)]">
          {items.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              size="sm"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="[&>span]:w-full [&>span]:justify-start"
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
