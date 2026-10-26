'use client';

import { Chip } from '@/app/components/ui';
import { MonthBarsChart } from '@/app/components/charts/month-bars-chart';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { dueLabel, installmentLoad, type DebtsSummary, type LogicalDay } from '@/app/components/pages/debt/debts-model';
import type { Debt } from '@/app/types/debt';
import type { SupportedCurrency } from '@/app/types/financial-summary';

const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function DebtsSummaryPanel({
  summary,
  currencies,
  onCurrency,
  showValues,
}: {
  summary: DebtsSummary;
  currencies: SupportedCurrency[];
  onCurrency: (currency: SupportedCurrency) => void;
  showValues: boolean;
}) {
  const money = (cents: number) => (showValues ? formatCurrency(cents, summary.currency) : '••••');
  const next = summary.nextDue;

  return (
    <section aria-labelledby="debts-hero-label" className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="debts-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">Você deve em {summary.currency}</p>
          <strong className="money mt-2 block break-words text-3xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
            {money(summary.owedCents)}
          </strong>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {summary.activeCount} {summary.activeCount === 1 ? 'dívida ativa' : 'dívidas ativas'} em {summary.currency}.
          </p>
        </div>
        {currencies.length > 1 && (
          <div className="flex gap-2" role="group" aria-label="Moeda das dívidas">
            {currencies.map((code) => (
              <Chip key={code} selected={code === summary.currency} onClick={() => onCurrency(code)}>{code}</Chip>
            ))}
          </div>
        )}
      </div>

      {summary.overdue.length > 0 && (
        <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--danger-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--expense)]">
          {summary.overdue.length === 1 ? '1 parcela vencida: ' : `${summary.overdue.length} parcelas vencidas: `}
          {summary.overdue.map((item) => `${item.debt.name} (${item.daysLate} ${item.daysLate === 1 ? 'dia' : 'dias'})`).join(', ')}.
        </p>
      )}

      <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${summary.dueSoon.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <Stat label="Parcelas por mês" value={money(summary.monthlyInstallmentCents)} detail={`${summary.withInstallmentCount} de ${summary.activeCount} com parcela informada`} />
        <Stat
          label="Próximo vencimento"
          value={next?.debt.dueDate ? dateLabel(next.debt.dueDate) : '—'}
          detail={next ? `${dueLabel(next.days)} · ${next.debt.name}` : 'sem vencimento futuro'}
        />
        <Stat
          label="Última parcela prevista"
          value={summary.lastInstallment ? `${monthNames[summary.lastInstallment.month - 1]}/${summary.lastInstallment.year}` : '—'}
          detail="pelo vencimento e parcelas restantes"
          className={summary.dueSoon.length > 0 ? '' : 'col-span-2 lg:col-span-1'}
        />
        {summary.dueSoon.length > 0 && (
          <Stat label="Vencem em 7 dias" value={String(summary.dueSoon.length)} detail={summary.dueSoon.map((debt) => debt.name).join(', ')} />
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, detail, className = '' }: { label: string; value: string; detail: string; className?: string }) {
  return (
    <div className={`grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-3.5 ${className}`}>
      <span className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">{label}</span>
      <span className="money truncate text-base font-semibold sm:text-lg">{value}</span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </div>
  );
}

export function InstallmentLoadPanel({
  debts,
  currency,
  today,
  withoutInstallmentCount,
  showValues,
}: {
  debts: Debt[];
  currency: SupportedCurrency;
  today: LogicalDay;
  withoutInstallmentCount: number;
  showValues: boolean;
}) {
  const compact = useMediaQuery('(max-width: 559px)');
  const months = installmentLoad(debts, currency, today, 12).slice(0, compact ? 6 : 12);
  const max = Math.max(1, ...months.map((item) => item.cents));
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');

  return (
    <section aria-labelledby="debts-load-title" className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <h2 id="debts-load-title" className="text-lg font-bold">Quanto você paga por mês</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Soma das parcelas das dívidas ativas nos próximos {months.length} meses. Passe o cursor ou toque numa coluna.
      </p>
      <div className="mt-4">
        <MonthBarsChart
          ariaLabel={`Parcelas por mês em ${currency}`}
          heightClass="h-32"
          bars={months.map((item, index) => ({
            key: `${item.year}-${item.month}`,
            label: monthNames[item.month - 1],
            valueLabel: `${money(item.cents)}${item.count > 0 ? ` · ${item.count} ${item.count === 1 ? 'parcela' : 'parcelas'}` : ''}`,
            heightPercent: item.cents === 0 ? 0 : Math.max(4, Math.round((item.cents / max) * 100)),
            current: index === 0,
          }))}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        {withoutInstallmentCount > 0
          ? `${withoutInstallmentCount} ${withoutInstallmentCount === 1 ? 'dívida ativa não tem parcela informada e fica' : 'dívidas ativas não têm parcela informada e ficam'} fora desta soma.`
          : 'Todas as dívidas ativas têm parcela informada.'}
      </p>
    </section>
  );
}
