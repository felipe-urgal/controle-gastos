'use client';

import { buildLede, summarizeActive } from '@/app/components/pages/goal/goals-center/goals-model';
import { Chip, MoneyText } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { FinancialGoal } from '@/app/types/financial-goal';

export default function GoalsHero({
  goals,
  currency,
  currencies,
  onCurrency,
  completedCount,
  now,
  showValues,
}: {
  goals: FinancialGoal[];
  currency: string;
  currencies: string[];
  onCurrency: (currency: string) => void;
  completedCount: number;
  now: Date;
  showValues: boolean;
}) {
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const summary = summarizeActive(goals, currency, now);

  return (
    <section aria-labelledby="goals-hero-label" className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id="goals-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">Você já juntou nas metas ativas</p>
        {currencies.length > 1 && (
          <div className="flex gap-2" role="group" aria-label="Moeda">
            {currencies.map((code) => (
              <Chip key={code} selected={code === currency} onClick={() => onCurrency(code)}>
                {code}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <strong className="money break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
        {money(summary.current)}
        <span className="ml-2 text-base font-semibold tracking-normal text-[var(--text-muted)]">de {money(summary.target)}</span>
      </strong>

      <div>
        <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`${summary.percent}% do total das metas ativas`}>
          <div className="h-full rounded-full bg-[var(--orbit-primary)]" style={{ width: `${summary.percent}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between gap-2 text-sm text-[var(--text-muted)]">
          <strong className="text-[var(--foreground)]">{summary.percent}%</strong>
          <span>Faltam <span className="money">{money(summary.remaining)}</span></span>
        </div>
      </div>

      <p className="max-w-[64ch] text-sm text-[var(--text-muted)]">
        <MoneyText>{buildLede(summary, money)}</MoneyText>
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Ativas" value={String(summary.count)} detail={summary.behind === 0 ? 'todas no ritmo' : `${summary.behind} ${summary.behind === 1 ? 'abaixo do ritmo ou vencida' : 'abaixo do ritmo ou vencidas'}`} />
        <Stat label="Concluídas" value={String(completedCount)} detail="já conquistadas" />
        <Stat label="Sugestão mensal" value={money(summary.monthly)} detail="soma das metas com prazo" />
      </div>
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="grid gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-4 py-3.5">
      <span className="text-sm font-semibold text-[var(--text-muted)]">{label}</span>
      <span className="money break-words text-xl font-semibold">{value}</span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </div>
  );
}
