'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FaChevronDown,
  FaFilter,
  FaList,
  FaSearch,
  FaThLarge,
  FaTimes,
} from 'react-icons/fa';

import { Button, Input, Select } from '@/app/components/ui';

export type FilterField =
  | {
      type: 'search';
      key: string;
      placeholder?: string;
    }
  | {
      type: 'select';
      key: string;
      label: string;
      options:
        | { label: string; value: string | number }[]
        | {
            label: string;
            options: { label: string; value: string | number }[];
          }[];
    }
  | {
      type: 'custom';
      key: string;
      render: (value: any, onChange: (value: any) => void) => React.ReactNode;
    };

interface Props {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onClear?: () => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  loading?: boolean;
  total?: number;
}

export default function DynamicFilters({
  fields,
  values,
  onChange,
  onClear,
  viewMode,
  onViewModeChange,
  loading,
  total,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  const filtersRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const floatingPanelRef = useRef<HTMLDivElement>(null);
  const headerButtonRef = useRef<HTMLButtonElement>(null);
  const floatingButtonRef = useRef<HTMLButtonElement>(null);

  const searchField = fields.find((field) => field.type === 'search');
  const otherFields = fields.filter((field) => field.type !== 'search');

  const activeFiltersCount = Object.values(values).filter(
    (value) => value !== undefined && value !== null && value !== '',
  ).length;
  const hasActiveFilters = activeFiltersCount > 0;

  useEffect(() => {
    const element = filtersRef.current;
    if (!element) return;

    const media = window.matchMedia('(max-width: 767px)');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!media.matches) {
          setShowFloatingButton(false);
          return;
        }
        setShowFloatingButton(!entry.isIntersecting);
      },
      { threshold: 0.05 },
    );

    observer.observe(element);

    const handleMediaChange = () => {
      if (!media.matches) setShowFloatingButton(false);
    };

    media.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideDesktopPanel = panelRef.current?.contains(target) ?? false;
      const clickedInsideMobilePanel = floatingPanelRef.current?.contains(target) ?? false;
      const clickedHeaderButton = headerButtonRef.current?.contains(target) ?? false;
      const clickedFloatingButton = floatingButtonRef.current?.contains(target) ?? false;

      if (
        !clickedInsideDesktopPanel &&
        !clickedInsideMobilePanel &&
        !clickedHeaderButton &&
        !clickedFloatingButton
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const renderFiltersContent = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchField && (
          <div className="order-1 min-w-0 flex-1">
            <Input
              value={values[searchField.key] || ''}
              onChange={(event) => onChange(searchField.key, event.target.value)}
              placeholder={searchField.placeholder}
              aria-label={searchField.placeholder ?? 'Pesquisar'}
              icon={<FaSearch />}
              disabled={loading}
            />
          </div>
        )}

        {viewMode && onViewModeChange && (
          <div
            className="flex self-end rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-0.5"
            role="group"
            aria-label="Modo de visualização"
          >
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              onClick={() => onViewModeChange('grid')}
              icon={<FaThLarge />}
              aria-label="Visualizar em grade"
              aria-pressed={viewMode === 'grid'}
            />
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              onClick={() => onViewModeChange('list')}
              icon={<FaList />}
              aria-label="Visualizar em lista"
              aria-pressed={viewMode === 'list'}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {otherFields.map((field) => {
          switch (field.type) {
            case 'select':
              return (
                <Select
                  key={field.key}
                  label={field.label}
                  value={values[field.key]}
                  onChange={(value) => onChange(field.key, value)}
                  options={field.options}
                  placeholder="Selecione uma opção"
                  grouped={
                    Array.isArray(field.options) &&
                    field.options.length > 0 &&
                    'options' in field.options[0]
                  }
                />
              );
            case 'custom':
              return (
                <div key={field.key}>
                  {field.render(values[field.key], (value) => onChange(field.key, value))}
                </div>
              );
            default:
              return null;
          }
        })}
      </div>

      {(hasActiveFilters || total !== undefined) && (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <p className="text-sm text-[var(--text-muted)]" role="status">
            {loading ? (
              'Carregando...'
            ) : (
              <>
                {total ?? 0} resultado{total === 1 ? '' : 's'}
                {hasActiveFilters && (
                  <span className="ml-1 text-[var(--text-subtle)]">com filtro aplicado</span>
                )}
              </>
            )}
          </p>

          {onClear && hasActiveFilters && (
            <Button
              size="sm"
              variant="link"
              onClick={() => {
                onClear();
                setIsOpen(false);
              }}
              icon={<FaTimes />}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {showFloatingButton && isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--overlay)] md:hidden"
          onClick={() => setIsOpen(false)}
          aria-label="Fechar filtros"
          tabIndex={-1}
        />
      )}

      {showFloatingButton && (
        <>
          <button
            ref={floatingButtonRef}
            type="button"
            onClick={() => setIsOpen((previous) => !previous)}
            aria-label={isOpen ? 'Fechar filtros' : 'Abrir filtros'}
            aria-expanded={isOpen}
            className={`
              fixed left-0 z-50 flex min-h-11 items-center justify-between gap-3
              border border-l-0 bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold shadow-[var(--shadow-surface)]
              transition-[width,border-color,border-radius] duration-150 md:hidden
              ${isOpen ? 'w-[min(92vw,420px)] rounded-tr-[var(--radius-lg)]' : 'w-auto rounded-r-[var(--radius-lg)]'}
              ${hasActiveFilters ? 'border-[var(--primary)] text-[var(--foreground)]' : 'border-[var(--border)] text-[var(--foreground)]'}
            `}
            style={{ top: 'calc(4rem + env(safe-area-inset-top) + 0.5rem)' }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <FaFilter className={hasActiveFilters ? 'text-[var(--primary)]' : ''} aria-hidden="true" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-[var(--primary)] px-2 text-sm font-semibold text-[var(--on-primary)]">
                  {activeFiltersCount}
                </span>
              )}
            </span>
            <FaChevronDown
              aria-hidden="true"
              className={`shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`fixed left-0 z-50 w-[min(92vw,420px)] origin-top-left transition-[opacity,transform] duration-150 md:hidden ${
              isOpen
                ? 'pointer-events-auto scale-100 opacity-100'
                : 'pointer-events-none scale-95 opacity-0'
            }`}
            style={{ top: 'calc(7.5rem + env(safe-area-inset-top))' }}
          >
            <div ref={floatingPanelRef} className="ds-panel rounded-l-none p-4">
              {renderFiltersContent()}
            </div>
          </div>
        </>
      )}

      <div
        ref={filtersRef}
        className="sticky z-30 md:top-4"
        style={{ top: 'calc(4rem + env(safe-area-inset-top) + 1rem)' }}
      >
        <div
          className={`ds-panel p-4 transition-colors duration-150 ${
            hasActiveFilters ? 'border-[var(--primary)]' : ''
          }`}
        >
          <button
            ref={headerButtonRef}
            type="button"
            onClick={() => setIsOpen((previous) => !previous)}
            aria-expanded={isOpen && !showFloatingButton}
            className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left"
          >
            <span className="flex min-w-0 flex-col items-start">
              <span className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                <FaFilter className={hasActiveFilters ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'} aria-hidden="true" />
                Filtros
                {hasActiveFilters && (
                  <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-[var(--primary)] px-2 text-sm font-semibold text-[var(--on-primary)]">
                    {activeFiltersCount}
                  </span>
                )}
              </span>

              {total !== undefined && (
                <span className="mt-1 truncate text-sm text-[var(--text-muted)]">
                  {loading
                    ? 'Carregando...'
                    : `${total} resultado${total === 1 ? '' : 's'}${
                        hasActiveFilters ? ' filtrados' : ''
                      }`}
                </span>
              )}
            </span>

            <FaChevronDown
              aria-hidden="true"
              className={`ml-3 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
                isOpen && !showFloatingButton ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        <div
          className={`absolute left-0 right-0 z-40 mt-2 origin-top transition-[opacity,transform] duration-150 ${
            showFloatingButton ? 'hidden md:block' : ''
          } ${
            isOpen && !showFloatingButton
              ? 'pointer-events-auto scale-y-100 opacity-100'
              : 'pointer-events-none scale-y-95 opacity-0'
          }`}
        >
          <div ref={panelRef} className="ds-panel p-4">
            {renderFiltersContent()}
          </div>
        </div>
      </div>
    </>
  );
}
