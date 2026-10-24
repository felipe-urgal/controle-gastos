'use client';

import { useState } from 'react';
import { FaPen } from 'react-icons/fa';

import { Button, ColorIconSelector, IconButton, IconRenderer, InlineInput, MoneyInlineInput, Select } from '@/app/components/ui';
import { isMonthlyLimitInvalid } from '@/app/components/pages/category/form/category-form-model';
import { CATEGORY_NAME_MAX_LENGTH } from '@/app/lib/categories/category-limits';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import type { CategoryType } from '@/app/types/category';
import type { SupportedCurrency } from '@/app/types/financial-summary';

export type CategoryCardValues = {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
};

const typeLabels: Record<CategoryType, string> = { EXPENSE: 'Despesa', INCOME: 'Receita' };

/**
 * A categoria como vai aparecer nas listas, já editável: nome, cor e ícone. Na criação de uma
 * despesa, também o limite mensal opcional.
 */
export function CategoryFormCard({
  values,
  onChange,
  loading,
  isEditing,
  monthlyLimit,
  onMonthlyLimitChange,
  limitCurrency,
  onLimitCurrencyChange,
}: {
  values: CategoryCardValues;
  onChange: (patch: Partial<CategoryCardValues>) => void;
  loading: boolean;
  isEditing: boolean;
  monthlyLimit: string;
  onMonthlyLimitChange: (value: string) => void;
  limitCurrency: SupportedCurrency;
  onLimitCurrencyChange: (currency: SupportedCurrency) => void;
}) {
  const [lookOpen, setLookOpen] = useState(false);
  const showLimit = !isEditing && values.type === 'EXPENSE';
  const limitInvalid = isMonthlyLimitInvalid(monthlyLimit);

  return (
    <section
      aria-label="Categoria"
      className="relative grid gap-5 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--category-color)_40%,var(--border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--category-color)_16%,var(--surface)),var(--surface)_70%)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
      style={{ ['--category-color' as string]: values.color }}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
        <IconButton
          label="Mudar cor e ícone"
          onClick={() => setLookOpen((open) => !open)}
          disabled={loading}
          aria-expanded={lookOpen}
          tone="solid"
          size="lg"
          className="relative"
          style={{ backgroundColor: values.color }}
          icon={
            <>
              <IconRenderer iconName={values.icon || 'tag'} size={24} />
              <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
                <FaPen />
              </span>
            </>
          }
        />

        <div className="min-w-0">
          <InlineInput
            aria-label="Nome da categoria"
            value={values.name}
            onChange={(event) => onChange({ name: event.target.value })}
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            required
            disabled={loading}
            placeholder="Dê um nome à categoria"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm font-medium text-[var(--text-muted)]">
              {typeLabels[values.type]}
            </span>
          </div>
        </div>
      </div>

      {lookOpen && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <ColorIconSelector
            color={values.color}
            icon={values.icon}
            onColorChange={(color) => onChange({ color })}
            onIconChange={(icon) => onChange({ icon })}
            disabled={loading}
          />
          <Button type="button" size="xs" variant="ghost" className="mt-2" onClick={() => setLookOpen(false)}>
            Fechar
          </Button>
        </div>
      )}

      {showLimit && (
        <div className="grid gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-3.5">
          <label htmlFor="category-monthly-limit" className="text-sm text-[var(--text-muted)]">
            Limite mensal (opcional)
          </label>
          <div className="flex items-end gap-3">
            <div className="w-28 shrink-0">
              <Select
                ariaLabel="Moeda do limite"
                value={limitCurrency}
                onChange={(value) => onLimitCurrencyChange(value as SupportedCurrency)}
                options={currencyOptions}
                disabled={loading}
              />
            </div>
            <MoneyInlineInput
              id="category-monthly-limit"
              size="amount"
              value={monthlyLimit}
              onValueChange={onMonthlyLimitChange}
              disabled={loading}
              aria-invalid={limitInvalid || undefined}
            />
          </div>
          <p className={`text-sm leading-relaxed ${limitInvalid ? 'text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}>
            {limitInvalid
              ? 'Informe um valor maior que zero, como 350,00.'
              : 'Cria o limite deste mês para a categoria. Dá para mudar depois, na lista de categorias.'}
          </p>
        </div>
      )}
    </section>
  );
}
