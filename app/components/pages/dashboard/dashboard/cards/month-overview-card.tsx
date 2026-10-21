'use client';

import { MonthlyDashboard } from '@/app/types/dashboard';
import { ComparisonDetail } from '@/app/components/pages/dashboard/dashboard/insight-cards';
import { MonthMetric } from '@/app/components/pages/dashboard/dashboard/cards/month-metric';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { displayMoney, monthLabel, signedMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function MonthOverviewCard({
  data,
  showValues,
  incomeWidth,
  expenseWidth,
}: {
  data: MonthlyDashboard;
  showValues: boolean;
  incomeWidth: number;
  expenseWidth: number;
}) {
  const previous = data.comparison.previousPeriod;

  return (
    <article className="min-h-[252px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Visão do mês</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Seu dinheiro em {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}.</p>
        </div>
        <span className="inline-flex min-h-9 items-center rounded-[9px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-semibold">
          {monthLabel(`${data.period.year}-${String(data.period.month).padStart(2, '0')}`)}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-[var(--border)]">
        <MonthMetric
          icon={<FaArrowUp aria-hidden="true" />}
          label="Receitas"
          value={displayMoney(data.summary.income, showValues, data.currency)}
          detail={
            <ComparisonDetail
              percentage={data.comparison.income.percentage}
              previousMonth={previous.month}
              previousYear={previous.year}
              tone={data.comparison.income.percentage !== null && data.comparison.income.percentage >= 0 ? 'income' : 'expense'}
            />
          }
          tone="income"
        />
        <MonthMetric
          icon={<FaArrowDown aria-hidden="true" />}
          label="Despesas"
          value={displayMoney(data.summary.expense, showValues, data.currency)}
          detail={
            <ComparisonDetail
              percentage={data.comparison.expense.percentage}
              previousMonth={previous.month}
              previousYear={previous.year}
            />
          }
          tone="expense"
        />
        <MonthMetric
          icon={<span aria-hidden="true">−</span>}
          label="Saldo do mês"
          value={signedMoney(data.summary.balance, showValues, data.currency)}
          detail={data.summary.balance < 0 ? 'Você gastou mais que recebeu.' : 'O mês está positivo até aqui.'}
          tone={data.summary.balance < 0 ? 'expense' : 'income'}
          iconTone="neutral"
        />
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-label="Proporção entre receitas e despesas">
        <span className="h-full bg-[var(--income)]" style={{ width: `${incomeWidth}%` }} />
        <span className="h-full bg-[var(--expense)]" style={{ width: `${expenseWidth}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold">
        <span>{displayMoney(data.summary.income, showValues, data.currency)}</span>
        <span className="text-[var(--expense)]">{displayMoney(data.summary.expense, showValues, data.currency)}</span>
      </div>
    </article>
  );
}
