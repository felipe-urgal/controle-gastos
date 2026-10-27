'use client';

import { MonthBarsChart } from '@/app/components/charts/month-bars-chart';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { FaRedo } from 'react-icons/fa';

import {
  buildTagHistoryBars,
  hasHistory,
  reportPeriodOptions,
} from '@/app/components/pages/tags/tags-model';
import { Button, Chip } from '@/app/components/ui';
import { CountUp, PopBox } from '@/app/components/ui/motion';
import { riseInView } from '@/app/components/ui/motion-presets';
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
  const reduce = useReducedMotion();
  const money = (cents: number, currency: string) => (showValues ? formatCurrency(cents, currency) : '••••');
  const history = report?.history[0] ?? null;
  const bars = history && hasHistory(history.points) ? buildTagHistoryBars(history.points) : null;

  return (
        <motion.aside
      id="tag-report"
      {...riseInView(reduce, 0.1)}
      className="scroll-mt-20 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pb-4 shadow-[var(--shadow-surface)]"
      aria-labelledby="tag-report-title"
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
                    <span className="block overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={tag?.id ?? 'none'}
                id="tag-report-title"
                className="break-words font-bold [overflow-wrap:anywhere]"
                style={{ transformOrigin: '0% 0%' }}
                initial={reduce ? false : { opacity: 0, rotate: -5, y: -8 }}
                animate={{ opacity: 1, rotate: 0, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: 'spring', stiffness: 220, damping: 11 }}
              >
                {tag ? `#${tag.name}` : 'Relatório por tag'}
              </motion.h2>
            </AnimatePresence>
          </span>
          <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">Receitas e despesas concluídas</p>
        </div>
        {tag && report && !loading ? (
          <Link
            href={`/transacoes?tagId=${encodeURIComponent(tag.id)}`}
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[var(--primary)]"
          >
            Abrir transações
          </Link>
        ) : null}
      </div>

      {tag ? (
        <div className="mt-3 flex flex-wrap gap-2 px-4" role="group" aria-label="Período do relatório">
          {reportPeriodOptions.map((option) => (
                        <Chip key={option.value} layoutId="tag-report-period" selected={period === option.value} onClick={() => onPeriodChange(option.value)} disabled={loading}>
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
                    report.currencies.map((item, index) => (
            <motion.div
              key={item.currency}
              className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4"
              initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18, delay: index * 0.1 } }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Resultado{report.currencies.length > 1 ? ` em ${item.currency}` : ''}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {item.transactionCount} {item.transactionCount === 1 ? 'transação' : 'transações'}
                </span>
              </div>
                            <strong className={`money text-2xl font-semibold ${item.balance < 0 ? 'text-[var(--expense)]' : item.balance > 0 ? 'text-[var(--income)]' : ''}`}>
                <CountUp amount={item.balance} format={(cents) => `${cents > 0 ? '+ ' : cents < 0 ? '− ' : ''}${money(Math.abs(cents), item.currency)}`} />
              </strong>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                                <PopBox index={0} whileHover="hover" className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-2">
                  <dt className="text-xs text-[var(--text-muted)]">Receitas</dt>
                  <motion.dd className="money origin-left font-semibold text-[var(--income)]" variants={{ hover: { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>{money(item.income, item.currency)}</motion.dd>
                </PopBox>
                <PopBox index={1} whileHover="hover" className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-2">
                  <dt className="text-xs text-[var(--text-muted)]">Despesas</dt>
                  <motion.dd className="money origin-left font-semibold text-[var(--expense)]" variants={{ hover: { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>{money(item.expense, item.currency)}</motion.dd>
                </PopBox>
                            </dl>
            </motion.div>
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

      <p className="mt-4 px-4 text-xs leading-relaxed text-[var(--text-muted)]">
                Tags podem se sobrepor na mesma transação: não some os totais de tags diferentes.
      </p>
    </motion.aside>
  );
}
