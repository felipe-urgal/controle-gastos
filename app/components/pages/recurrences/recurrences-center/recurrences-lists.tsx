'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FaArrowRight, FaStopCircle } from 'react-icons/fa';

import {
  daysUntil,
  frequencyLabel,
  relativeDays,
  shortDate,
} from '@/app/components/pages/recurrences/recurrences-center/recurrences-model';
import { Button, IconButton, IconLink } from '@/app/components/ui';
import { riseInView } from '@/app/components/ui/motion-presets';
import { reducedTransition } from '@/app/components/ui/motion';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { RecurrenceLogicalDate, RecurrenceSummaryItem } from '@/app/types/recurrence';
import type { SubscriptionItem } from '@/app/types/subscription';

/** Linhas das listas: entram deslizando de um lado (`dir`) em sequência; no hover (ou toque) o conteúdo anda 4px. */
const listRow = (index: number, reduce: boolean | null, dir: 1 | -1) => ({
  initial: reduce ? false : { opacity: 0, x: dir * 40 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: reducedTransition(reduce, { type: 'spring' as const, stiffness: 240, damping: 22, delay: Math.min(index, 8) * 0.07 }),
});

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
  const reduce = useReducedMotion();
  const money = (cents: number, currency: string) => (showValues ? formatCurrency(cents, currency) : '••••');

  return (
    <motion.section {...riseInView(reduce, 0.05)} className={`${cardClassName} min-w-0`} aria-labelledby="formal-recurrences-title">
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
          {items.map((item, index) => (
            <motion.li
              key={item.id}
              {...listRow(index, reduce, -1)}
              whileHover="hover"
              className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 overflow-hidden border-t border-[var(--border)] px-4 py-3 sm:px-5"
            >
              <motion.div className="min-w-0" variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}>
                <strong className="block break-words text-sm">{item.description}</strong>
                <span className="block break-words text-xs text-[var(--text-muted)]">
                  {frequencyLabel(item.frequency, item.interval)} · {item.account.name} · {item.category.name}
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Próximo: <strong className="font-semibold text-[var(--foreground)]">{shortDate(item.nextOccurrence)} · {relativeDays(daysUntil(item.nextOccurrence, today))}</strong>
                  {' · '}
                  {item.remainingOccurrences} {item.remainingOccurrences === 1 ? 'restante' : 'restantes'}
                </span>
              </motion.div>
              <div className="text-right">
                <motion.span className="money block origin-right text-sm font-semibold" variants={{ hover: { scale: 1.1, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
                  {money(item.amount, item.currency)}
                </motion.span>
                <span className="money text-xs text-[var(--text-muted)]">≈ {money(item.monthlyEquivalent, item.currency)}/mês</span>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2">
                <motion.span className="inline-flex" whileTap={{ scale: 0.94 }}>
                  <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                    Editar série
                  </Button>
                </motion.span>
                <span className="flex">
                  <motion.span className="flex" whileHover={{ x: 4 }} whileTap={{ x: 4 }}>
                    <IconLink label={`Editar próxima ocorrência de ${item.description}`} href={`/transacoes/alterar/${item.transactionId}`} icon={<FaArrowRight />} />
                  </motion.span>
                  <motion.span className="flex" whileHover={{ rotate: 90 }} whileTap={{ rotate: 90 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
                    <IconButton
                      label={`Encerrar ${item.description}`}
                      icon={<FaStopCircle />}
                      tone="danger"
                      disabled={endingId === item.id}
                      onClick={() => onEnd(item)}
                    />
                  </motion.span>
                </span>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.section>
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
  const reduce = useReducedMotion();
  const money = (cents: number, currency: string) => (showValues ? formatCurrency(cents, currency) : '••••');
  const active = items.filter((item) => item.activeForTotals);

  return (
    <motion.section {...riseInView(reduce, 0.15)} className={`${cardClassName} min-w-0`} aria-labelledby="confirmed-subscriptions-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
        <h2 id="confirmed-subscriptions-title" className="text-base font-bold">Assinaturas confirmadas</h2>
        <p className="text-xs text-[var(--text-muted)]">{active.length} {active.length === 1 ? 'ativa' : 'ativas'}</p>
      </div>
      {items.length === 0 ? (
        <p className="border-t border-[var(--border)] px-4 py-6 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma assinatura confirmada ainda. Confirme as sugestões em “Para revisar”.</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <motion.li
              key={item.id}
              {...listRow(index, reduce, 1)}
              whileHover="hover"
              className="grid gap-2 overflow-hidden border-t border-[var(--border)] px-4 py-3 sm:px-5"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <motion.div className="min-w-0" variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}>
                  <strong className="block break-words text-sm">{item.description}</strong>
                  <span className="block text-xs text-[var(--text-muted)]">
                    {frequencyLabel(item.frequency, item.interval)} · próxima {shortDate(item.nextCharge)}
                    {item.recurrenceSeriesId && (
                      <span className="ml-1 inline-flex items-center gap-1 font-semibold text-[var(--income)]">
                        · recorrência ativa
                        {/* Um pontinho que pulsa: a série está rodando. */}
                        <motion.i
                          aria-hidden="true"
                          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--income)]"
                          animate={reduce ? undefined : { scale: [1, 1.8, 1], opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </span>
                    )}
                  </span>
                </motion.div>
                <div className="text-right">
                  <motion.span className="money block origin-right text-sm font-semibold" variants={{ hover: { scale: 1.1, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
                    {money(item.currentAmount, item.currency)}
                  </motion.span>
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
            </motion.li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}
