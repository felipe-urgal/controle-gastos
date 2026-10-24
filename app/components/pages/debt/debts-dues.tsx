'use client';

import { FaCheck } from 'react-icons/fa';

import { Button } from '@/app/components/ui';
import { daysUntil, dueLabel, type LogicalDay } from '@/app/components/pages/debt/debts-model';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { Debt } from '@/app/types/debt';

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function DebtsDues({
  debts,
  today,
  showValues,
  onPay,
}: {
  debts: Debt[];
  today: LogicalDay;
  showValues: boolean;
  onPay: (debt: Debt) => void;
}) {
  const dues = debts
    .filter((debt) => debt.status === 'ACTIVE' && debt.dueDate)
    .map((debt) => ({ debt, days: daysUntil(debt.dueDate as string, today) }))
    .sort((left, right) => left.days - right.days);

  return (
    <section aria-labelledby="debts-dues-title" className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <h2 id="debts-dues-title" className="text-lg font-bold">Próximos vencimentos</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Dívidas ativas com data de vencimento, da mais próxima para a mais distante.</p>
      {dues.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhum vencimento cadastrado.</p>
      ) : (
        <ul className="mt-2">
          {dues.map(({ debt, days }) => {
            const tone = days < 0 ? 'bg-[var(--danger-subtle)] text-[var(--expense)]' : days <= 7 ? 'bg-[var(--warning-subtle)] text-[var(--warning)]' : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]';
            return (
              <li key={debt.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--border)] py-3 first:border-t-0">
                <div className="min-w-0">
                  <strong className="block truncate text-sm">{debt.name}</strong>
                  <span className="block text-xs text-[var(--text-muted)]">{dateLabel(debt.dueDate as string)}{debt.institution ? ` · ${debt.institution}` : ''}</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{dueLabel(days)}</span>
                  <strong className="money text-sm">{debt.installmentAmount === null ? '—' : showValues ? formatCurrency(debt.installmentAmount, debt.currency) : '••••'}</strong>
                  <Button size="sm" icon={<FaCheck aria-hidden="true" />} onClick={() => onPay(debt)}>Registrar pagamento</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
