'use client';

import { useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { Button, MoneyInput, Select } from '@/app/components/ui';
import { currencyOptions } from '@/app/lib/constants/account.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { errorMessage } from '@/app/lib/error-message';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { TagBudgetStatus, TagDTO } from '@/app/types/tag';

/**
 * Orçamento do projeto (ex.: uma viagem): um valor numa moeda para tudo que a tag acumula, desde o início.
 * A despesa vem do relatório (líquida, só na moeda do orçamento); aqui só se define, mostra e remove o valor.
 */
export default function TagBudgetSection({
  tag,
  budget,
  showValues,
  onSave,
}: {
  tag: Pick<TagDTO, 'name' | 'budgetAmount' | 'budgetCurrency'>;
  budget: TagBudgetStatus | null;
  showValues: boolean;
  onSave: (next: { amount: number; currency: SupportedCurrency } | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>(tag.budgetCurrency ?? 'BRL');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const money = (cents: number, code: string) => (showValues ? formatCurrency(cents, code) : '••••');

  async function submit(next: { amount: number; currency: SupportedCurrency } | null) {
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível salvar o orçamento.'));
    } finally {
      setSaving(false);
    }
  }

  function save() {
    const cents = parseMoneyInputToCents(amount);
    if (cents === null) {
      setError('Informe um valor maior que zero.');
      return;
    }
    void submit({ amount: cents, currency });
  }

  const progress = budget ? Math.min(100, Math.max(0, Math.round(budget.percentage))) : 0;

  return (
    <section aria-label="Orçamento do projeto" className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[var(--text-muted)]">Orçamento do projeto</span>
        {!editing && (
          <Button
            type="button"
            size="compact"
            variant="outline"
            onClick={() => {
              setAmount('');
              setCurrency(tag.budgetCurrency ?? 'BRL');
              setError('');
              setEditing(true);
            }}
          >
            {budget ? 'Alterar' : 'Definir'}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyInput label="Valor" currency={currency} value={amount} onValueChange={setAmount} placeholder="5.000,00" disabled={saving} />
            <Select
              label="Moeda"
              value={currency}
              onChange={(value) => setCurrency(value as SupportedCurrency)}
              options={currencyOptions.map((option) => ({ value: option.value, label: option.label }))}
              disabled={saving}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={save} isLoading={saving} disabled={saving}>Salvar</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
            {budget && (
              <Button type="button" size="sm" variant="danger" onClick={() => void submit(null)} disabled={saving}>Remover</Button>
            )}
          </div>
        </div>
      ) : budget ? (
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="money font-semibold">{money(budget.spent, budget.currency)}</span>
            <span className="money text-[var(--text-muted)]">de {money(budget.amount, budget.currency)}</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
            role="progressbar"
            aria-label={`Orçamento de #${tag.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className={`h-full rounded-full ${budget.over ? 'bg-[var(--expense)]' : 'bg-[var(--income)]'}`} style={{ width: `${progress}%` }} />
          </div>
          <p className={`text-xs ${budget.over ? 'font-semibold text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}>
            {budget.over
              ? `Estourou em ${money(Math.abs(budget.remaining), budget.currency)} (${budget.percentage}% do orçamento).`
              : `Ainda cabem ${money(budget.remaining, budget.currency)} (${budget.percentage}% usado). Conta tudo da tag, desde o início.`}
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          Defina quanto este projeto pode custar e acompanhe o gasto de todas as transações com #{tag.name}.
        </p>
      )}

      {error && <Alert variant="error" message={error} />}
    </section>
  );
}
