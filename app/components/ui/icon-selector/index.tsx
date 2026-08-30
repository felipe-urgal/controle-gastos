'use client';

import { useId, useState } from 'react';
import { FaCheck, FaList, FaSearch, FaThLarge } from 'react-icons/fa';

import IconRenderer, { ICON_MAP, useIcons } from '../icon-renderer';

interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

type ViewMode = 'grid' | 'list';

const categories = [
  { id: 'all', label: 'Todos' },
  { id: 'finance', label: 'Finanças' },
  { id: 'account', label: 'Contas' },
  { id: 'expense', label: 'Despesas' },
  { id: 'income', label: 'Receitas' },
  { id: 'action', label: 'Ações' },
];

export default function IconSelector({
  value,
  onChange,
  disabled = false,
  className = '',
  label = 'Ícone da conta',
}: IconSelectorProps) {
  const { getIconsByCategory, getIconLabel, searchIcons } = useIcons();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const searchId = useId();

  const icons = searchTerm
    ? searchIcons(searchTerm).map((item) => item.key)
    : selectedCategory === 'all'
      ? Object.keys(ICON_MAP)
      : getIconsByCategory(selectedCategory);

  const groupedIcons = icons.reduce<Record<string, string[]>>((groups, iconKey) => {
    const category = ICON_MAP[iconKey]?.category || 'other';
    groups[category] ??= [];
    groups[category].push(iconKey);
    return groups;
  }, {});

  const getCategoryLabel = (category: string) =>
    categories.find((item) => item.id === category)?.label ?? category;

  return (
    <div className={`w-full space-y-4 ${className}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <span className="ds-label">{label}</span>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-60">
            <label htmlFor={searchId} className="sr-only">
              Buscar ícone
            </label>
            <FaSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar ícone..."
              disabled={disabled}
              className="ds-control pl-10 pr-3.5"
            />
          </div>

          <div
            className="flex rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-0.5"
            aria-label="Modo de visualização"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              disabled={disabled}
              aria-label="Visualização em grade"
              aria-pressed={viewMode === 'grid'}
              className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <FaThLarge aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              disabled={disabled}
              aria-label="Visualização em lista"
              aria-pressed={viewMode === 'list'}
              className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <FaList aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Filtrar ícones por categoria">
        {categories.map((category) => {
          const selected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setSelectedCategory(category.id);
                setSearchTerm('');
              }}
              disabled={disabled}
              aria-pressed={selected}
              className={`min-h-11 rounded-[var(--radius-md)] border px-3.5 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--foreground)]'
                  : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <p className="ds-helper" role="status">
        {icons.length} {icons.length === 1 ? 'ícone encontrado' : 'ícones encontrados'}
      </p>

      <div className="max-h-80 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-3">
        {icons.length === 0 ? (
          <div className="py-8 text-center text-[var(--text-muted)]">
            <div className="mb-3 text-2xl" aria-hidden="true">
              🔍
            </div>
            <p className="text-base font-medium">Nenhum ícone encontrado</p>
            <p className="mt-1 text-sm">Tente buscar por outro termo</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
            {icons.map((iconKey) => {
              const selected = value === iconKey;
              const iconLabel = getIconLabel(iconKey);

              return (
                <button
                  key={iconKey}
                  type="button"
                  onClick={() => onChange(iconKey)}
                  disabled={disabled}
                  aria-label={`Selecionar ícone ${iconLabel}`}
                  aria-pressed={selected}
                  className={`relative flex min-h-12 min-w-12 aspect-square items-center justify-center rounded-[var(--radius-md)] border p-2 transition-[background-color,border-color,color,box-shadow] ${
                    selected
                      ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)] ring-1 ring-[var(--primary)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  title={iconLabel}
                >
                  <IconRenderer iconName={iconKey} size={24} />
                  {selected && (
                    <span
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)]"
                      aria-hidden="true"
                    >
                      <FaCheck size={10} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedIcons).map(([category, categoryIcons]) => (
              <section key={category} className="space-y-2">
                <h4 className="sticky top-0 z-10 bg-[var(--surface-raised)] py-2 text-sm font-semibold text-[var(--text-muted)]">
                  {getCategoryLabel(category)}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categoryIcons.map((iconKey) => {
                    const selected = value === iconKey;
                    const iconLabel = getIconLabel(iconKey);

                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => onChange(iconKey)}
                        disabled={disabled}
                        aria-pressed={selected}
                        className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border px-3.5 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? 'border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--foreground)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                        title={iconLabel}
                      >
                        <IconRenderer iconName={iconKey} size={18} />
                        <span>{iconLabel}</span>
                        {selected && <FaCheck className="ml-1 text-[var(--primary)]" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
