'use client';

import { FaChevronRight } from 'react-icons/fa';

import { Chip, IconRenderer } from '@/app/components/ui';
import { DEFAULT_CATEGORY_COLOR } from '@/app/lib/categories/default-color';
import type { CategoryModel } from '@/app/types/category';
import type { CategoryMonthlyLimitItem } from '@/app/types/category-monthly-limit';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import {
  barClass,
  displayMoney,
  percentageClass,
  usageLabel,
  usagePercentage,
} from '@/app/components/pages/category/index/mobile-categories-center/mobile-categories-helpers';

export function ExpenseCategoryCard({
  item,
  currency,
  showValues,
  onOpen,
}: {
  item: CategoryMonthlyLimitItem;
  currency: SupportedCurrency;
  showValues: boolean;
  onOpen: () => void;
}) {
  const percentage = usagePercentage(item);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className="grid h-16 w-16 place-items-center rounded-full border border-white/10 text-[24px] text-white"
          style={{ backgroundColor: `${item.category.color || DEFAULT_CATEGORY_COLOR}2b` }}
          aria-hidden="true"
        >
          <IconRenderer
            iconName={item.category.icon || 'tag'}
            size={25}
            color={item.category.color || DEFAULT_CATEGORY_COLOR}
          />
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <strong className="truncate text-[18px] font-extrabold text-[var(--foreground)]">
              {item.category.name}
            </strong>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">
              Despesa
            </span>
            {!item.category.isActive && (
              <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">
                Inativa
              </span>
            )}
          </div>

          <p className="mt-3 text-[16px] font-bold text-[var(--foreground)]">
            {displayMoney(item.consumption, showValues, currency)}
            <span className="font-medium text-[var(--text-muted)]">
              {' '}/ {displayMoney(item.limit?.amount ?? null, showValues, currency)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <strong className={`text-[18px] font-extrabold ${percentageClass(item)}`}>
            {usageLabel(item)}
          </strong>
          <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
        </div>
      </div>

      <div
        {...(item.limit
          ? {
              role: 'progressbar',
              'aria-label': `Uso do limite de ${item.category.name}`,
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuenow': Math.round(Math.min(100, Math.max(0, percentage))),
              'aria-valuetext': usageLabel(item),
            }
          : { 'aria-hidden': true })}
        className="ml-[76px] mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
      >
        {item.limit && (
          <div
            className={`h-full rounded-full ${barClass(item)}`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        )}
      </div>
    </button>
  );
}

export function IncomeCategoryCard({
  category,
  onOpen,
}: {
  category: CategoryModel;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className="grid h-16 w-16 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[24px]"
          aria-hidden="true"
        >
          <IconRenderer
            iconName={category.icon || 'income-up'}
            size={25}
            color={category.color || DEFAULT_CATEGORY_COLOR}
          />
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <strong className="truncate text-[18px] font-extrabold text-[var(--foreground)]">
              {category.name}
            </strong>
            <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              Receita · Fora do orçamento
            </span>
            {!category.isActive && (
              <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">
                Inativa
              </span>
            )}
          </div>
          {category.description && (
            <p className="mt-2 truncate text-sm text-[var(--text-muted)]">{category.description}</p>
          )}
        </div>

        <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
      </div>
    </button>
  );
}

export function CategorySkeleton() {
  return (
    <div className="h-[130px] animate-pulse rounded-[20px] border border-[var(--border)] bg-[var(--surface)]" />
  );
}

export function MobileFilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-2 text-sm font-bold text-[var(--text-muted)]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([optionValue, optionLabel]) => (
          <Chip
            key={optionValue}
            selected={value === optionValue}
            onClick={() => onChange(optionValue)}
          >
            {optionLabel}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

export function SheetMetric({
  label,
  value,
  className = 'text-[var(--foreground)]',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className={`mt-1 tabular-nums text-sm font-extrabold ${className}`}>{value}</dd>
    </div>
  );
}
