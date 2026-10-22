'use client';

import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';
import { DashboardNetWorthSummary, MonthlyDashboard } from '@/app/types/dashboard';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { FinancialInsight } from '@/app/types/financial-insight';
import { compactMonthLabel, dashboardLogicalDateLabel, displayMoney, signedMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';

export function ComparisonDetail({
  percentage,
  previousMonth,
  previousYear,
  tone = 'neutral',
}: {
  percentage: number | null;
  previousMonth: number;
  previousYear: number;
  tone?: 'income' | 'expense' | 'neutral';
}) {
  if (percentage === null) {
    return <span className="text-[var(--text-muted)]">sem base anterior</span>;
  }

  const direction =
    percentage > 0 ? 'aumentou' : percentage < 0 ? 'reduziu' : 'sem mudança';
  const toneClass =
    tone === 'income'
      ? percentage > 0
        ? 'text-[var(--income)]'
        : percentage < 0
          ? 'text-[var(--expense)]'
          : 'text-[var(--text-muted)]'
      : tone === 'expense'
        ? percentage > 0
          ? 'text-[var(--expense)]'
          : percentage < 0
            ? 'text-[var(--income)]'
            : 'text-[var(--text-muted)]'
        : 'text-[var(--text-muted)]';

  const percentageLabel =
    percentage === 0
      ? ''
      : ` ${Math.abs(percentage).toLocaleString('pt-BR', {
          maximumFractionDigits: 1,
        })}%`;

  return (
    <>
      <span className={toneClass}>{direction}{percentageLabel}</span>
      <span className="text-[var(--text-muted)]">
        {' '}vs. {compactMonthLabel(previousMonth, previousYear)}
      </span>
    </>
  );
}

export function NetWorthSummaryCard({
  currency,
  showValues,
  summary,
  period,
}: {
  currency: SupportedCurrency;
  showValues: boolean;
  summary: {
    data: DashboardNetWorthSummary | null;
    loading: boolean;
    error: string;
  };
  period: MonthlyDashboard['period'];
}) {
  const value = summary.loading
    ? 'Carregando…'
    : summary.error
      ? 'Indisponível'
      : summary.data?.total === null || summary.data?.total === undefined
        ? 'Sem saldo realizado'
        : displayMoney(summary.data.total, showValues, currency);

  return (
    <Link
      href="/patrimonio"
      className="flex min-h-[88px] items-center justify-between gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] transition hover:border-[var(--orbit-primary)]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:p-5"
      aria-label="Ver patrimônio"
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Patrimônio no fim de {compactMonthLabel(period.month, period.year)} · {currency}
        </span>
        <strong className={`mt-1 block tabular-nums text-xl font-extrabold ${summary.error ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>
          {value}
        </strong>
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          {summary.loading
            ? 'Atualizando resumo'
            : summary.error
              ? summary.error
              : (summary.data?.accountCount ?? 0) === 0
                ? 'Nenhuma conta elegível com saldo realizado'
                : `${summary.data?.accountCount} ${summary.data?.accountCount === 1 ? 'conta elegível' : 'contas elegíveis'}`}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--orbit-primary)]">
        Ver patrimônio
        <FaArrowRight aria-hidden="true" />
      </span>
    </Link>
  );
}

export function insightDetail(
  insight: FinancialInsight,
  showValues: boolean,
  currency: SupportedCurrency,
) {
  if (insight.type === 'CATEGORY_BUDGET') {
    return `${displayMoney(insight.data.consumption, showValues, currency)} de ${displayMoney(insight.data.budget, showValues, currency)}`;
  }

  if (insight.type === 'UPCOMING_PENDING') {
    return `${displayMoney(insight.data.amount, showValues, currency)} até ${dashboardLogicalDateLabel(insight.data.through)}`;
  }

  if (insight.type === 'RECURRING_SHARE') {
    return `${displayMoney(insight.data.monthlyEquivalent, showValues, currency)} equivalente mensal`;
  }

  if (insight.type === 'SPENDING_ANOMALY') {
    return `${displayMoney(insight.data.currentAmount, showValues, currency)} vs. mediana de ${displayMoney(insight.data.baselineMedian, showValues, currency)}`;
  }

  if (insight.type === 'SAFE_TO_SPEND') {
    return `${displayMoney(insight.data.safeToSpend, showValues, currency)} disponíveis em 30 dias`;
  }

  if (insight.type === 'SUBSCRIPTION_PRICE_CHANGE') {
    return `${displayMoney(insight.data.previousAmount, showValues, currency)} → ${displayMoney(insight.data.currentAmount, showValues, currency)}`;
  }

  if (insight.type === 'POSSIBLE_SUBSCRIPTION') {
    return `${displayMoney(insight.data.monthlyEquivalent, showValues, currency)}/mês · ${insight.data.occurrenceCount} ocorrências`;
  }

  if (insight.type === 'INCOME_CHANGE') {
    return `${displayMoney(insight.data.currentIncome, showValues, currency)} vs. ${displayMoney(insight.data.previousIncome, showValues, currency)} no período anterior`;
  }

  if (insight.type === 'GOAL_DELAYED') {
    return `${displayMoney(insight.data.currentAmount, showValues, currency)} de ${displayMoney(insight.data.targetAmount, showValues, currency)}`;
  }

  return `${signedMoney(insight.data.difference, showValues, currency)} em 30 dias`;
}
