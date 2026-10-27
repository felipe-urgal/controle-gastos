'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FaCheck } from 'react-icons/fa';

import { Button } from '@/app/components/ui';
import { reducedTransition } from '@/app/components/ui/motion';
import { riseInView } from '@/app/components/ui/motion-presets';
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
  const reduce = useReducedMotion();
  const dues = debts
    .filter((debt) => debt.status === 'ACTIVE' && debt.dueDate)
    .map((debt) => ({ debt, days: daysUntil(debt.dueDate as string, today) }))
    .sort((left, right) => left.days - right.days);

  return (
    <motion.section {...riseInView(reduce, 0.05)} aria-labelledby="debts-dues-title" className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <h2 id="debts-dues-title" className="text-lg font-bold">Próximos vencimentos</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Dívidas ativas com data de vencimento, da mais próxima para a mais distante.</p>
      {dues.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhum vencimento cadastrado.</p>
      ) : (
        <ul className="mt-2">
          {dues.map(({ debt, days }, index) => {
            const tone = days < 0 ? 'bg-[var(--danger-subtle)] text-[var(--expense)]' : days <= 7 ? 'bg-[var(--warning-subtle)] text-[var(--warning)]' : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]';
            return (
              <motion.li
                key={debt.id}
                initial={reduce ? false : { opacity: 0, x: -36 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={reducedTransition(reduce, { type: 'spring', stiffness: 240, damping: 22, delay: Math.min(index, 8) * 0.07 })}
                whileHover="hover"
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 overflow-hidden border-t border-[var(--border)] py-3 first:border-t-0"
              >
                <motion.div className="min-w-0" variants={{ hover: { x: 4, transition: { type: 'spring', stiffness: 400, damping: 22 } } }}>
                  <strong className="block truncate text-sm">{debt.name}</strong>
                  <span className="block text-xs text-[var(--text-muted)]">{dateLabel(debt.dueDate as string)}{debt.institution ? ` · ${debt.institution}` : ''}</span>
                </motion.div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {/* Vencida pulsa; a pílula das demais só aparece com um pequeno "pop". */}
                  <motion.span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}
                    animate={days < 0 && !reduce ? { scale: [1, 1.1, 1] } : undefined}
                    transition={days < 0 ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
                  >
                    {dueLabel(days)}
                  </motion.span>
                  <strong className="money text-sm">{debt.installmentAmount === null ? '—' : showValues ? formatCurrency(debt.installmentAmount, debt.currency) : '••••'}</strong>
                  <motion.span className="inline-flex" whileTap={{ scale: 0.92 }}>
                    <Button variant={days < 0 ? 'primary' : 'outline'} size="sm" icon={<FaCheck aria-hidden="true" />} aria-label={`Registrar pagamento de ${debt.name}`} onClick={() => onPay(debt)}>Pagar</Button>
                  </motion.span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
