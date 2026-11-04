'use client';

import type { Dispatch, SetStateAction } from 'react';

import { Button, MoneyInput, Select } from '@/app/components/ui';
import { centsToMoneyValue, moneyValueToCents } from '@/app/lib/currency/money-mask';
import type { FormData } from '@/app/lib/interface/transaction.interface';
import type { CategoryModel } from '@/app/types/category';

type AllocationEditorProps = {
  formData: FormData;
  setFormData: Dispatch<SetStateAction<FormData>>;
  categories: CategoryModel[];
  categoryType: CategoryModel['type'] | null;
  loading: boolean;
  formatCents: (cents: number) => string;
};

/** Divisão de uma transação entre categorias; o saldo continua sendo uma única transação. */
export function AllocationEditor({
  formData,
  setFormData,
  categories,
  categoryType,
  loading,
  formatCents,
}: AllocationEditorProps) {
  const allocations = formData.allocations ?? [];
  const splitEnabled = allocations.length > 0;
  const availableCategories = categories.filter(
    (category) =>
      category.type === categoryType &&
      (category.isActive || category.id === formData.categoryId),
  );

  return (
    <div className="px-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm text-[var(--text-muted)]">Dividir em categorias</span>
          <p className="mt-0.5 text-xs text-[var(--text-subtle)]">O saldo continua sendo uma única transação.</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() =>
          setFormData((previous) => ({
            ...previous,
            allocations: splitEnabled ? [] : [
              { categoryId: previous.categoryId, amount: previous.amount },
              { categoryId: '', amount: 0 },
            ],
          }))
        }>
          {splitEnabled ? 'Remover divisão' : 'Dividir'}
        </Button>
      </div>
      {splitEnabled && (
        <div className="mt-3 grid gap-2">
          {allocations.map((allocation, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
              <Select
                ariaLabel={`Categoria da divisão ${index + 1}`}
                value={allocation.categoryId}
                disabled={loading || index === 0}
                onChange={(value) => setFormData((previous) => ({
                  ...previous,
                  allocations: (previous.allocations ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, categoryId: String(value) } : item),
                }))}
                placeholder="Selecione a categoria"
                options={availableCategories.map((category) => ({ value: category.id, label: category.name }))}
              />
              <MoneyInput aria-label={`Valor da divisão ${index + 1}`} enterKeyHint="next"
                value={allocation.amount > 0 ? centsToMoneyValue(allocation.amount) : ''} disabled={loading}
                onValueChange={(next) => {
                  const amount = moneyValueToCents(next) ?? 0;
                  setFormData((previous) => ({
                    ...previous,
                    allocations: (previous.allocations ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, amount } : item),
                  }));
                }}
                className="text-right" placeholder="0,00" />
              <Button variant="outline" disabled={loading || allocations.length <= 2 || index === 0} onClick={() =>
                setFormData((previous) => ({ ...previous, allocations: (previous.allocations ?? []).filter((_, itemIndex) => itemIndex !== index) }))
              }>
                Remover
              </Button>
            </div>
          ))}
          <Button variant="outline" disabled={loading || allocations.length >= 20}
            onClick={() => setFormData((previous) => ({ ...previous, allocations: [...(previous.allocations ?? []), { categoryId: '', amount: 0 }] }))}>
            + Adicionar categoria
          </Button>
          <p className="text-xs text-[var(--text-muted)]">Total dividido: {formatCents(allocations.reduce((sum, item) => sum + item.amount, 0))} de {formatCents(formData.amount)}</p>
        </div>
      )}
    </div>
  );
}
