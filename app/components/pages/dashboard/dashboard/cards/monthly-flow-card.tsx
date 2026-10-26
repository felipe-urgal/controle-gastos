'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CARD_VIEWPORT, reducedTransition } from '@/app/components/pages/dashboard/dashboard/cards/card-motion';
import { useState, type KeyboardEvent } from 'react';

import { compactMonthLabel, displayMoney, signedMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import type { DashboardMonthlyFlow, DashboardPeriodRelation } from '@/app/types/dashboard';

export type FlowBar = {
  key: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
  /** Altura das colunas, em % da maior receita ou despesa da janela. */
  incomeHeight: number;
  expenseHeight: number;
  current: boolean;
};

/** Colunas de receita e despesa dos meses da janela; o último é o mês selecionado. */
export function buildFlowBars(flow: DashboardMonthlyFlow[]): FlowBar[] {
  const max = Math.max(1, ...flow.flatMap((month) => [month.income, month.expense]));
  const height = (value: number) => (value > 0 ? Math.max(2, (value / max) * 100) : 0);

  return flow.map((month, index) => ({
    key: `${month.year}-${month.month}`,
    label: compactMonthLabel(month.month, month.year),
    income: month.income,
    expense: month.expense,
    balance: month.balance,
    incomeHeight: height(month.income),
    expenseHeight: height(month.expense),
    current: index === flow.length - 1,
  }));
}

export function MonthlyFlowCard({
  flow,
  relation,
  showValues,
  currency,
}: {
  flow: DashboardMonthlyFlow[];
  relation: DashboardPeriodRelation;
  showValues: boolean;
  currency: string;
}) {
  const reduce = useReducedMotion();
  const bars = buildFlowBars(flow);
  const [active, setActive] = useState<number | null>(null);
  const lastIndex = bars.length - 1;
  const shownIndex = active ?? lastIndex;
  const shown = bars[shownIndex];
  const partial = relation === 'CURRENT';

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setActive(Math.min(lastIndex, Math.max(0, shownIndex + (event.key === 'ArrowRight' ? 1 : -1))));
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  }

  return (
    <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5" aria-labelledby="dashboard-flow-title">
      <h2 id="dashboard-flow-title" className="text-lg font-bold">Entrou vs. saiu</h2>
      <p className="mt-0.5 text-xs text-[var(--text-muted)]">Últimos {bars.length} meses{partial ? ' · o último está em andamento' : ''}.</p>

      {shown && (
        <p className="mt-3 min-h-10 text-sm text-[var(--text-muted)]" aria-live="polite">
          <strong className="capitalize text-[var(--foreground)]">{shown.label}</strong>
          {active === null && shown.current && partial ? ' (até agora)' : ''}
          {': '}
          entrou <strong className="money text-[var(--income)]">{displayMoney(shown.income, showValues, currency)}</strong>
          {', saiu '}
          <strong className="money text-[var(--expense)]">{displayMoney(shown.expense, showValues, currency)}</strong>
          {', sobrou '}
          <strong className="money text-[var(--foreground)]">{signedMoney(shown.balance, showValues, currency)}</strong>
        </p>
      )}

      <div
        role="group"
        aria-label="Receitas e despesas por mês"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
        className="mt-2 grid h-36 items-end gap-2 rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]"
        style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
      >
        {bars.map((bar, index) => {
          const dim = active !== null && active !== index;
          return (
            <div
              key={bar.key}
              className="flex h-full cursor-pointer flex-col items-center justify-end gap-1"
              onPointerEnter={(event) => event.pointerType === 'mouse' && setActive(index)}
              onPointerDown={() => setActive(index)}
            >
              <div className={`flex h-full w-full max-w-12 items-end justify-center gap-1 transition-opacity ${dim ? 'opacity-45' : ''}`}>
                <motion.span
                  className="block w-1/2 rounded-t-md bg-[var(--income)]"
                  initial={{ height: 0 }}
                  whileInView={{ height: `${bar.incomeHeight}%` }}
                  viewport={CARD_VIEWPORT}
                  transition={reducedTransition(reduce, { type: 'spring', stiffness: 170, damping: 14, delay: index * 0.08 })}
                  role="img"
                  aria-label={`${bar.label}: entrou ${displayMoney(bar.income, showValues, currency)}`}
                />
                <motion.span
                  className={`block w-1/2 rounded-t-md bg-[var(--expense)] ${bar.current && partial ? 'opacity-60' : ''}`}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${bar.expenseHeight}%` }}
                  viewport={CARD_VIEWPORT}
                  transition={reducedTransition(reduce, { type: 'spring', stiffness: 170, damping: 14, delay: index * 0.08 + 0.06 })}
                  role="img"
                  aria-label={`${bar.label}: saiu ${displayMoney(bar.expense, showValues, currency)}`}
                />
              </div>
              <span className={`text-xs capitalize ${index === shownIndex ? 'font-bold text-[var(--foreground)]' : 'text-[var(--text-muted)]'}`}>{bar.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--income)]" aria-hidden="true" />Entrou</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[var(--expense)]" aria-hidden="true" />Saiu</span>
      </div>
    </article>
  );
}
