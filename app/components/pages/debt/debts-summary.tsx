'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { Chip } from '@/app/components/ui';
import { CountUp, reducedTransition } from '@/app/components/ui/motion';
import { riseInView } from '@/app/components/ui/motion-presets';
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
  const reduce = useReducedMotion();
  const money = (cents: number) => (showValues ? formatCurrency(cents, summary.currency) : '••••');
  const next = summary.nextDue;

  return (
    <motion.section
      aria-labelledby="debts-hero-label"
      // O resumo "pesa": cai do alto, amassa um pouco ao bater e assenta.
      initial={reduce ? false : { opacity: 0, y: -70, scaleY: 1.1 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: [-70, 0, -6, 0], scaleY: [1.1, 0.96, 1.01, 1] }}
      transition={{ duration: 0.7, ease: 'easeIn', times: [0, 0.55, 0.78, 1], delay: 0.1 }}
      style={{ transformOrigin: '50% 100%' }}
      className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="debts-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">Você deve em {summary.currency}</p>
          <strong className="money mt-2 block break-words text-3xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
            <CountUp amount={summary.owedCents} format={money} />
          </strong>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {summary.activeCount} {summary.activeCount === 1 ? 'dívida ativa' : 'dívidas ativas'} em {summary.currency}.
          </p>
        </div>
        {currencies.length > 1 && (
          <div className="flex gap-2" role="group" aria-label="Moeda das dívidas">
            {currencies.map((code) => (
              <Chip key={code} layoutId="debts-currency" selected={code === summary.currency} onClick={() => onCurrency(code)}>{code}</Chip>
            ))}
          </div>
        )}
      </div>

      {summary.overdue.length > 0 && (
        <motion.p
          role="alert"
          // Vencidas: o aviso entra de lado e treme, e uma barrinha vermelha pulsa na borda.
          initial={reduce ? false : { opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: reduce ? 0 : [-50, 0, -7, 5, -2, 0] }}
          transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--danger-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--expense)]"
        >
          {!reduce && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1 bg-[var(--expense)]"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {summary.overdue.length === 1 ? '1 parcela vencida: ' : `${summary.overdue.length} parcelas vencidas: `}
          {summary.overdue.map((item) => `${item.debt.name} (${item.daysLate} ${item.daysLate === 1 ? 'dia' : 'dias'})`).join(', ')}.
        </motion.p>
      )}

      <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${summary.dueSoon.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <Stat index={0} label="Parcelas por mês" value={money(summary.monthlyInstallmentCents)} detail={`${summary.withInstallmentCount} de ${summary.activeCount} com parcela informada`} />
        <Stat
          index={1}
          label="Próximo vencimento"
          value={next?.debt.dueDate ? dateLabel(next.debt.dueDate) : '—'}
          detail={next ? `${dueLabel(next.days)} · ${next.debt.name}` : 'sem vencimento futuro'}
        />
        <Stat
          index={2}
          label="Última parcela prevista"
          value={summary.lastInstallment ? `${monthNames[summary.lastInstallment.month - 1]}/${summary.lastInstallment.year}` : '—'}
          detail="pelo vencimento e parcelas restantes"
          className={summary.dueSoon.length > 0 ? '' : 'col-span-2 lg:col-span-1'}
        />
        {summary.dueSoon.length > 0 && (
          <Stat index={3} label="Vencem em 7 dias" value={String(summary.dueSoon.length)} detail={summary.dueSoon.map((debt) => debt.name).join(', ')} />
        )}
      </div>
    </motion.section>
  );
}

function Stat({ index, label, value, detail, className = '' }: { index: number; label: string; value: string; detail: string; className?: string }) {
  const reduce = useReducedMotion();

  return (
    // Os quadros crescem de baixo para cima (como colunas) ao entrar; no hover (ou toque) o valor cresce.
    <motion.div
      className={`grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-3.5 ${className}`}
      style={{ transformOrigin: '50% 100%' }}
      initial={reduce ? false : { opacity: 0, scaleY: 0.3 }}
      animate={{ opacity: 1, scaleY: 1, transition: reducedTransition(reduce, { type: 'spring', stiffness: 240, damping: 16, delay: 0.7 + index * 0.1 }) }}
      whileHover="hover"
      whileTap="hover"
    >
      <span className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">{label}</span>
      <motion.span className="money origin-left truncate text-base font-semibold sm:text-lg" variants={{ hover: { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
        {value}
      </motion.span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </motion.div>
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
  const reduce = useReducedMotion();
  const compact = useMediaQuery('(max-width: 559px)');
  const months = installmentLoad(debts, currency, today, 12).slice(0, compact ? 6 : 12);
  const max = Math.max(1, ...months.map((item) => item.cents));
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');

  return (
    <motion.section {...riseInView(reduce, 0.1)} aria-labelledby="debts-load-title" className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
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
    </motion.section>
  );
}
