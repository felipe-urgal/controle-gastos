'use client';

import type { ReactNode } from 'react';

export function MonthMetric({
  icon,
  label,
  value,
  detail,
  tone,
  iconTone = tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: ReactNode;
  tone: 'income' | 'expense' | 'neutral';
  iconTone?: 'income' | 'expense' | 'neutral';
}) {
  const toneClass =
    tone === 'income'
      ? 'text-[var(--income)]'
      : tone === 'expense'
        ? 'text-[var(--expense)]'
        : 'text-[var(--foreground)]';
  const iconToneClass =
    iconTone === 'income'
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : iconTone === 'expense'
        ? 'bg-[var(--danger-subtle)] text-[var(--expense)]'
        : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]';
  return (
    <div className="min-w-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconToneClass}`}>{icon}</span>
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
      </div>
      <strong className={`money mt-2 block break-words text-xl font-extrabold ${toneClass}`}>{value}</strong>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}
