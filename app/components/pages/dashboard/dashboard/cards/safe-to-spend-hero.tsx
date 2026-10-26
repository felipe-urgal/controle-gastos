'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { CountUp, reducedTransition } from '@/app/components/ui/motion';
import Link from 'next/link';
import { FaChevronDown } from 'react-icons/fa';

import { SectionMessage } from '@/app/components/pages/dashboard/dashboard/cards/section-message';
import { displayMoney, logicalDateDistance, signedMoney } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { ComparisonDetail } from '@/app/components/pages/dashboard/dashboard/insight-cards';
import { Button } from '@/app/components/ui';
import type { DashboardHome, MonthlyDashboard } from '@/app/types/dashboard';
import type { ForecastData } from '@/app/types/forecast';

type Margin = { label: string; className: string };

/** Compara o disponível com o saldo realizado; não promete nada além do que o cálculo conservador mostra. */
export function safeToSpendMargin(safeToSpend: ForecastData['safeToSpend']): Margin {
  if (safeToSpend.safeToSpend < 0) {
    return { label: 'Compromissos acima do saldo', className: 'bg-[var(--danger-subtle)] text-[var(--expense)]' };
  }
  if (safeToSpend.realizedBalance <= 0 || safeToSpend.safeToSpend < safeToSpend.realizedBalance * 0.15) {
    return { label: 'Margem apertada', className: 'bg-[var(--warning-subtle)] text-[var(--warning)]' };
  }
  return { label: 'Margem confortável', className: 'bg-[var(--surface-subtle)] text-[var(--income)]' };
}

/** Quanto dá para gastar por dia até o fim do horizonte; o último dia conta como um dia inteiro. */
export function safeToSpendPerDay(
  safeToSpend: number,
  through: { year: number; month: number; day: number },
  asOf: { year: number; month: number; day: number },
) {
  if (safeToSpend <= 0) return null;

  const days = Math.max(logicalDateDistance(through, asOf), 1);
  return { days, perDay: Math.floor(safeToSpend / days) };
}

/** Preenchimento que varre o botão da esquerda para a direita ao passar o mouse. */
function SweepFill({ children }: { children: React.ReactNode }) {
  return (
    <motion.span className="relative isolate inline-flex overflow-hidden rounded-full" whileHover="hover" whileTap={{ scale: 0.97 }}>
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 -z-10 origin-left bg-[var(--primary-subtle)]"
        style={{ scaleX: 0 }}
        variants={{ hover: { scaleX: 1 } }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />
      {children}
    </motion.span>
  );
}

const PART_LABELS: Record<string, string> = { free: 'Livre para gastar', pending: 'Pendências', cards: 'Faturas em aberto' };

/** Barra segmentada: o segmento sob o cursor cresce e um balão mostra o nome e o valor. */
function SegmentedBar({ parts, money }: { parts: Array<{ key: string; value: number; color: string }>; money: (amount: number) => string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  // Centro de cada segmento, em % da largura, a partir do que vem antes dele.
  const centers = Object.fromEntries(
    parts.map((part, index) => {
      const before = parts.slice(0, index).reduce((sum, item) => sum + item.value, 0);
      return [part.key, ((before + part.value / 2) / total) * 100];
    }),
  );
  const active = parts.find((part) => part.key === hovered);

  return (
    <div className="relative" aria-hidden="true" onPointerLeave={() => setHovered(null)}>
      <AnimatePresence>
        {active && (
          <motion.span
            key={active.key}
            className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold shadow-[var(--shadow-elevated)]"
            style={{ left: `${centers[active.key]}%` }}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: active.color }} />
            {PART_LABELS[active.key] ?? active.key}
            <span className="money ml-1.5 tabular-nums text-[var(--text-muted)]">{money(active.value)}</span>
          </motion.span>
        )}
      </AnimatePresence>
      <div className="flex h-2.5 items-center gap-0.5">
        {parts.map((part) => (
          <motion.span
            key={part.key}
            className="block min-w-[3px] rounded-full"
            style={{ flex: part.value, background: part.color, height: '100%' }}
            animate={{ scaleY: hovered === part.key ? 1.9 : 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            onPointerEnter={() => setHovered(part.key)}
            onPointerDown={() => setHovered(part.key)}
          />
        ))}
      </div>
    </div>
  );
}

export function SafeToSpendHero({
  cashAccounts,
  asOf,
  summary,
  comparison,
  safeToSpend,
  horizonEnd,
  loading,
  error,
  showValues,
  currency,
  onOpenForecast,
  forecastEnabled,
  onRetry,
}: {
  cashAccounts: DashboardHome['current']['cash']['accounts'];
  asOf: DashboardHome['scope']['currentAsOf'];
  summary: MonthlyDashboard['summary'];
  comparison: MonthlyDashboard['comparison'];
  safeToSpend: ForecastData['safeToSpend'] | null;
  horizonEnd: ForecastData['horizonEnd'] | null;
  loading: boolean;
  error: string;
  showValues: boolean;
  currency: string;
  onOpenForecast: () => void;
  forecastEnabled: boolean;
  onRetry?: () => void;
}) {
  const reduce = useReducedMotion();
  const through = safeToSpend?.through ?? horizonEnd;
  const horizonLabel = through
    ? `${String(through.day).padStart(2, '0')}/${String(through.month).padStart(2, '0')}`
    : '30 dias';
  const margin = safeToSpend ? safeToSpendMargin(safeToSpend) : null;
  const money = (amount: number) => displayMoney(amount, showValues, currency);

  const breakdown = safeToSpend
    ? [
        { label: 'Saldo realizado', value: money(safeToSpend.realizedBalance), sign: '', color: 'var(--text-subtle)' },
        { label: 'Pendências conhecidas', value: money(safeToSpend.pendingExpenses), sign: safeToSpend.pendingExpenses > 0 ? '− ' : '', color: 'var(--warning)' },
        { label: 'Faturas em aberto', value: money(safeToSpend.cardCommitments), sign: safeToSpend.cardCommitments > 0 ? '− ' : '', color: 'var(--primary)' },
        ...(safeToSpend.transferNet !== 0
          ? [{ label: 'Transferências', value: money(Math.abs(safeToSpend.transferNet)), sign: safeToSpend.transferNet > 0 ? '+ ' : '− ', color: 'var(--info)' }]
          : []),
      ]
    : [];
  const barBase = safeToSpend ? safeToSpend.realizedBalance : 0;
  const barParts = safeToSpend && barBase > 0
    ? [
        { key: 'free', value: Math.max(safeToSpend.safeToSpend, 0), color: 'var(--income)' },
        { key: 'pending', value: safeToSpend.pendingExpenses, color: 'var(--warning)' },
        { key: 'cards', value: safeToSpend.cardCommitments, color: 'var(--primary)' },
      ].filter((part) => part.value > 0)
    : [];

  const perDay = safeToSpend && through ? safeToSpendPerDay(safeToSpend.safeToSpend, through, asOf) : null;
  const previous = comparison.previousPeriod;
  const keptShare = summary.income > 0 && summary.balance > 0
    ? `${Math.round((summary.balance / summary.income) * 100)}% do que entrou`
    : null;

  return (
    <section
      className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5"
      aria-labelledby="dashboard-hero-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="dashboard-hero-title" className="text-sm font-medium text-[var(--text-muted)]">
          Disponível para gastar
        </h2>
        <span className="text-xs text-[var(--text-muted)]">até {horizonLabel} · só o que já está lançado</span>
      </div>

      {error ? (
        <SectionMessage tone="error" className="mt-3" onRetry={onRetry} retryLabel="Tentar novamente: disponível para gastar">{error}</SectionMessage>
      ) : loading ? (
        <div className="mt-3 h-24 animate-pulse rounded-xl bg-[var(--skeleton)]" role="status" aria-label="Carregando disponível para gastar" />
      ) : safeToSpend ? (
        <div className="mt-2 space-y-4">
          <div className="flex flex-wrap items-end gap-x-7 gap-y-3">
            <strong
              className={`block money text-4xl font-semibold leading-none tracking-[-0.035em] tabular-nums sm:text-5xl ${safeToSpend.safeToSpend < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}
            >
              {showValues ? (
                <CountUp amount={safeToSpend.safeToSpend} format={money} className="money" />
              ) : (
                <span className="money">{money(safeToSpend.safeToSpend)}</span>
              )}
            </strong>
            <div className="flex flex-col items-start gap-1.5">
              {margin && (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={reducedTransition(reduce, { type: 'spring', stiffness: 420, damping: 16, delay: 0.55 })}
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${margin.className}`}
                >
                  {margin.label}
                </motion.span>
              )}
              {perDay && (
                <span className="text-sm">
                  ≈ <strong className="money tabular-nums">{money(perDay.perDay)}</strong> por dia
                  <span className="text-[var(--text-muted)]"> · {perDay.days} {perDay.days === 1 ? 'dia' : 'dias'}</span>
                </span>
              )}
            </div>
          </div>

          {barParts.length > 0 && <SegmentedBar parts={barParts} money={money} />}

          <details className="group">
            <motion.summary
              whileHover="hover"
              className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden"
            >
              <span className="relative">
                Como chegamos nesse valor
                {/* O sublinhado se desenha da esquerda e o chevron balança. */}
                <motion.span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-current"
                  style={{ scaleX: 0 }}
                  variants={{ hover: { scaleX: 1 } }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <motion.span className="flex" variants={{ hover: { rotate: [0, -14, 12, -6, 0], transition: { duration: 0.5 } } }}>
                <FaChevronDown className="text-xs transition-transform group-open:rotate-180" aria-hidden="true" />
              </motion.span>
            </motion.summary>
            <dl className="grid gap-x-6 gap-y-1 pb-2 text-sm sm:grid-cols-2">
              {breakdown.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: row.color }} aria-hidden="true" />
                    {row.label}
                  </dt>
                  <dd className="money text-sm font-medium tabular-nums text-[var(--foreground)]">{row.sign}{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">
              Receitas futuras não entram na conta; metas e dívidas só contam quando já viraram compromisso. Saldo de {cashAccounts.length} {cashAccounts.length === 1 ? 'conta corrente' : 'contas correntes'}.
            </p>
            <div className="flex flex-wrap gap-x-5">
              <SweepFill>
                <Link href="/contas" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-[var(--primary)]">Ver contas</Link>
              </SweepFill>
              <SweepFill>
                <Button type="button" size="sm" variant="ghost" onClick={onOpenForecast} disabled={!forecastEnabled}>
                  Ver projeção dos próximos 30 dias
                </Button>
              </SweepFill>
            </div>
          </details>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-muted)]">Sem dados elegíveis nesta moeda.</p>
      )}

      <dl className="mt-4 grid grid-cols-3 border-t border-[var(--border)] pt-4">
        <div className="min-w-0 pr-2 sm:pr-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Entrou</dt>
          <motion.dd whileHover={{ scale: 1.08 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }} style={{ transformOrigin: 'left center' }} className="money mt-1.5 break-words text-sm font-bold text-[var(--income)] sm:text-xl">{money(summary.income)}</motion.dd>
          <dd className="mt-1 text-xs">
            <ComparisonDetail percentage={comparison.income.percentage} previousMonth={previous.month} previousYear={previous.year} tone="income" />
          </dd>
        </div>
        <div className="min-w-0 border-l border-[var(--border)] px-2 sm:px-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Saiu</dt>
          <motion.dd whileHover={{ scale: 1.08 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }} style={{ transformOrigin: 'left center' }} className="money mt-1.5 break-words text-sm font-bold text-[var(--expense)] sm:text-xl">{money(summary.expense)}</motion.dd>
          <dd className="mt-1 text-xs">
            <ComparisonDetail percentage={comparison.expense.percentage} previousMonth={previous.month} previousYear={previous.year} tone="expense" />
          </dd>
        </div>
        <div className="min-w-0 border-l border-[var(--border)] pl-2 sm:pl-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Sobrou</dt>
          <motion.dd whileHover={{ scale: 1.08 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }} style={{ transformOrigin: 'left center' }} className={`money mt-1.5 break-words text-sm font-bold sm:text-xl ${summary.balance < 0 ? 'text-[var(--expense)]' : 'text-[var(--foreground)]'}`}>{signedMoney(summary.balance, showValues, currency)}</motion.dd>
          <dd className="mt-1 text-xs text-[var(--text-muted)]">
            {summary.balance < 0 ? 'Gastou mais que recebeu' : keptShare}
          </dd>
        </div>
      </dl>
    </section>
  );
}
