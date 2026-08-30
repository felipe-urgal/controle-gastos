'use client';

import { IconRenderer } from '@/app/components/ui';
import { typeConfig } from '@/app/lib/constants/category.constants';
import { ViewProps } from '@/app/lib/interface/category.interface';
import { highlightText } from '@/app/lib/string/highlight-text';

export default function ViewCard({ category, searchTerm = '' }: ViewProps) {
  const type = typeConfig[category.type];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
            style={{ backgroundColor: category.color || '#64748B' }}
            aria-hidden="true"
          >
            <IconRenderer iconName={category.icon || 'tag'} size={18} />
          </span>

          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[var(--foreground)]">
              {highlightText(category.name, searchTerm)}
            </h3>
            <span
              className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${type.bgColor} ${type.color} ${type.borderColor}`}
            >
              {type.label}
            </span>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-sm font-semibold ${
            category.isActive
              ? 'border-[var(--primary)]/35 bg-[var(--primary-subtle)] text-[var(--income)]'
              : 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]'
          }`}
        >
          {category.isActive ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      <p className="min-h-10 line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">
        {category.description
          ? highlightText(category.description, searchTerm)
          : 'Sem descrição cadastrada.'}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm text-[var(--text-subtle)]">
        <span>Criada em {new Date(category.createdAt).toLocaleDateString('pt-BR')}</span>
        {category.position > 0 && <span>Ordem {category.position}</span>}
      </div>
    </div>
  );
}
