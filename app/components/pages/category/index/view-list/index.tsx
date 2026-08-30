'use client';

import { IconRenderer } from '@/app/components/ui';
import { typeConfig } from '@/app/lib/constants/category.constants';
import { ViewProps } from '@/app/lib/interface/category.interface';
import { highlightText } from '@/app/lib/string/highlight-text';

export default function ViewList({ category, searchTerm = '' }: ViewProps) {
  const type = typeConfig[category.type];

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(250px,1.5fr)_minmax(140px,.7fr)_minmax(140px,.7fr)_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
          style={{ backgroundColor: category.color || '#64748B' }}
          aria-hidden="true"
        >
          <IconRenderer iconName={category.icon || 'tag'} size={18} />
        </span>

        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[var(--foreground)]">
            {highlightText(category.name, searchTerm)}
          </p>
          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
            {category.description
              ? highlightText(category.description, searchTerm)
              : 'Sem descrição'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-sm text-[var(--text-subtle)] md:hidden">Tipo</span>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${type.bgColor} ${type.color} ${type.borderColor}`}
        >
          {type.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-sm text-[var(--text-subtle)] md:hidden">Status</span>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${
            category.isActive
              ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)] text-[var(--income)]'
              : 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]'
          }`}
        >
          {category.isActive ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 md:block md:text-right">
        <span className="text-sm text-[var(--text-subtle)] md:hidden">Criada em</span>
        <p className="text-sm font-medium text-[var(--foreground)]">
          {new Date(category.createdAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}
