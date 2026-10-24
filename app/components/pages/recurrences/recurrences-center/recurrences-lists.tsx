'use client';

import { FaArrowRight, FaStopCircle } from 'react-icons/fa';

import {
  daysUntil,
  frequencyLabel,
  relativeDays,
  shortDate,
} from '@/app/components/pages/recurrences/recurrences-center/recurrences-model';
import { Button, IconButton, IconLink } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { RecurrenceLogicalDate, RecurrenceSummaryItem } from '@/app/types/recurrence';
import type { SubscriptionItem } from '@/app/types/subscription';

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]';

export function FormalList({
  items,
  showValues,
  today,
  endingId,
  onEdit,
  onEnd,
}: {
  items: RecurrenceSummaryItem[];
  showValues: boolean;
  today: RecurrenceLogicalDate;
  endingId: string | null;
  onEdit: (item: RecurrenceSummaryItem) => void;
  onEnd: (item: RecurrenceSummaryItem) => void;
}) {
  const money = (cents: number, currency: string) => (showValues ? formatCurrency(cents, currency) : '••••');

  return (
    <section className={`${cardClassName} min-w-0`} aria-labelledby="formal-recurrences-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
        <h2 id="formal-recurrences-title" className="text-base font-bold">Recorrências ativas</h2>
        <p className="text-xs text-[var(--text-muted)]">
          {items.length} {items.length === 1 ? 'série' : 'séries'} · só as cadastradas entram nos totais
        </p>
      </div>
      {items.length === 0 ? (
        <p className="border-t border-[var(--border)] px-4 py-6 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma recorrência ativa.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              key={item.id}
              className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t border-[var(--border)] px-4 py-3 sm:px-5"
            >
              <div className="min-w-0">
                <strong className="block break-words text-sm">{item.description}</strong>
                <span className="block break-words text-xs text-[var(--text-muted)]">
                  {frequencyLabel(item.frequency, item.interval)} · {item.account.name} · {item.category.name}
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Próximo: <strong className="font-semibold text-[var(--foreground)]">{shortDate(item.nextOccurrence)} · {relativeDays(daysUntil(item.nextOccurrence, today))}</strong>
                  {' · '}
                  {item.remainingOccurrences} {item.remainingOccurrences === 1 ? 'restante' : 'restantes'}
                </span>
              </div>
              <div className="text-right">
                <span className="money block text-[15px] font-semibold">{money(item.amount, item.currency)}</span>
                <span className="money text-xs text-[var(--text-muted)]">≈ {money(item.monthlyEquivalent, item.currency)}/mês</span>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2">
                <Button variant="accent" size="sm" onClick={() => onEdit(item)}>
                  Editar série
                </Button>
                <span className="flex">
                  <IconLink label={`Editar próxima ocorrência de ${item.description}`} href={`/transacoes/alterar/${item.transactionId}`} icon={<FaArrowRight />} />
                  <IconButton
                    label={`Encerrar ${item.description}`}
                    icon={<FaStopCircle />}
                    tone="danger"
                    disabled={endingId === item.id}
                    onClick={() => onEnd(item)}
                  />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ConfirmedSubscriptions({
  items,
  showValues,
  busyKey,
  onCreateRecurrence,
}: {
  items: SubscriptionItem[];
  showValues: boolean;
  busyKey: string | null;
  onCreateRecurrence: (id: string) => void;
}) {
  const money = (cents: number, currency: string) => (showValues ? formatCurrency(cents, currency) : '••••');
  const active = items.filter((item) => item.activeForTotals);

  return (
    <section className={`${cardClassName} min-w-0`} aria-labelledby="confirmed-subscriptions-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
        <h2 id="confirmed-subscriptions-title" className="text-base font-bold">Assinaturas confirmadas</h2>
        <p className="text-xs text-[var(--text-muted)]">{active.length} {active.length === 1 ? 'ativa' : 'ativas'}</p>
      </div>
      {items.length === 0 ? (
        <p className="border-t border-[var(--border)] px-4 py-6 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma assinatura confirmada.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="grid gap-2 border-t border-[var(--border)] px-4 py-3 sm:px-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <strong className="block break-words text-sm">{item.description}</strong>
                  <span className="block text-xs text-[var(--text-muted)]">
                    {frequencyLabel(item.frequency, item.interval)} · próxima {shortDate(item.nextCharge)}
                    {item.recurrenceSeriesId && <span className="ml-1 font-semibold text-[var(--income)]">· recorrência ativa</span>}
                  </span>
                </div>
                <div className="text-right">
                  <span className="money block text-[15px] font-semibold">{money(item.currentAmount, item.currency)}</span>
                  <span className="money text-xs text-[var(--text-muted)]">{money(item.annualEquivalent, item.currency)}/ano</span>
                </div>
              </div>
              {!item.recurrenceSeriesId && !item.requiresActivityReview && (
                <div>
                  <Button variant="outline" size="sm" disabled={busyKey === `subscription:${item.id}`} onClick={() => onCreateRecurrence(item.id)}>
                    {busyKey === `subscription:${item.id}` ? 'Criando…' : 'Criar recorrência'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
