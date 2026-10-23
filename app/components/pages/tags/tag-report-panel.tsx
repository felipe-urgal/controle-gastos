'use client';

import { MonthBarsChart } from '@/app/components/charts/month-bars-chart';
import Link from 'next/link';
import { FaRedo } from 'react-icons/fa';

import {
  buildTagHistoryBars,
  hasHistory,
  reportPeriodOptions,
} from '@/app/components/pages/tags/tags-model';
import { Button, Chip } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { TagDTO, TagReport, TagReportPeriod } from '@/app/types/tag';

export default function TagReportPanel({
  tag,
  report,
  period,
  loading,
  error,
  showValues,
  onPeriodChange,
  onRetry,
}: {
  tag: TagDTO | null;
  report: TagReport | null;
  period: TagReportPeriod;
  loading: boolean;
  error: string;
  showValues: boolean;
  onPeriodChange: (period: TagReportPeriod) => void;
  onRetry: () => void;
}) {
  const money = (cents: number, currency: string) => (showValues ? formatCurrency(cents, currency) : '••••');
  const history = report?.history[0] ?? null;
  const bars = history && hasHistory(history.points) ? buildTagHistoryBars(history.points) : null;

  return (
    <aside id="tag-report" className="ds-panel h-fit scroll-mt-4 pb-4" aria-labelledby="tag-report-title">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 id="tag-report-title" className="break-words font-bold [overflow-wrap:anywhere]">
            {tag ? `#${tag.name}` : 'Relatório por tag'}
          </h2>
          <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">Receitas e despesas concluídas</p>
        </div>
        {tag && report && !loading ? (
          <Link
            href={`/transacoes?tagId=${encodeURIComponent(tag.id)}`}
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[var(--orbit-primary)]"
          >
            Abrir transações
          </Link>
        ) : null}
      </div>

      <p className="mt-2 px-4 text-xs leading-relaxed text-[var(--text-muted)]">
        Tags podem se sobrepor na mesma transação. Por isso, totais de tags diferentes não devem ser somados entre si.
      </p>

      {tag ? (
        <div className="mt-3 flex flex-wrap gap-2 px-4" role="group" aria-label="Período do relatório">
          {reportPeriodOptions.map((option) => (
            <Chip key={option.value} selected={period === option.value} onClick={() => onPeriodChange(option.value)} disabled={loading}>
              {option.label}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 px-4">
        {!tag ? (
          <p className="text-sm text-[var(--text-muted)]">Selecione uma tag para ver receitas e despesas concluídas, separadas por moeda.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--text-muted)]" role="status">Carregando relatório de #{tag.name}…</p>
        ) : error ? (
          <div className="rounded-xl border border-[var(--expense)]/35 bg-[var(--danger-subtle)] p-3">
            <p role="alert" className="text-sm text-[var(--expense)]">{error}</p>
            <Button className="mt-3" variant="outline" size="sm" icon={<FaRedo aria-hidden="true" />} onClick={onRetry}>
              Tentar novamente
            </Button>
          </div>
        ) : !report || report.currencies.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {period === 'all' ? 'Sem transações concluídas nesta tag.' : 'Sem transações concluídas neste período.'}
          </p>
        ) : (
          report.currencies.map((item) => (
            <dl key={item.currency} className="rounded-xl border border-[var(--border)] p-3 text-sm">
              <div className="flex justify-between gap-3"><dt>Moeda</dt><dd className="font-bold">{item.currency}</dd></div>
              <div className="mt-2 flex justify-between gap-3"><dt>Transações</dt><dd>{item.transactionCount}</dd></div>
              <div className="mt-2 flex justify-between gap-3"><dt>Receitas</dt><dd className="money">{money(item.income, item.currency)}</dd></div>
              <div className="mt-2 flex justify-between gap-3"><dt>Despesas</dt><dd className="money">{money(item.expense, item.currency)}</dd></div>
              <div className="mt-2 flex justify-between gap-3 border-t border-[var(--border)] pt-2">
                <dt>Resultado</dt>
                <dd className="money font-bold">{money(item.balance, item.currency)}</dd>
              </div>
            </dl>
          ))
        )}

        {bars && history && !loading && !error ? (
          <section aria-label={`Despesa dos últimos 6 meses em ${history.currency}`}>
            <p className="text-xs font-semibold text-[var(--text-muted)]">Despesa nos últimos 6 meses · {history.currency}</p>
            <div className="mt-2">
              <MonthBarsChart
                ariaLabel={`Despesa por mês em ${history.currency}`}
                heightClass="h-24"
                bars={bars.map((bar) => ({ key: bar.key, label: bar.label, valueLabel: money(bar.expense, history.currency), heightPercent: bar.heightPercent, current: bar.current }))}
              />
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
