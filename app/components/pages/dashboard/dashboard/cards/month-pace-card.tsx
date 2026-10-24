'use client';

import Link from 'next/link';

import { PlanningMetric } from '@/app/components/pages/dashboard/dashboard/cards/planning-metric';
import { buildMonthPace, type MonthPace, type PaceStatus } from '@/app/components/pages/dashboard/dashboard/dashboard-pace';
import { displayMoney, monthLabel } from '@/app/components/pages/dashboard/dashboard/dashboard-helpers';
import { ChartCursor } from '@/app/components/charts/chart-cursor';
import { useChartWidth } from '@/app/components/charts/use-chart-width';
import { useChartScrub } from '@/app/components/charts/use-chart-scrub';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { DashboardPeriodRelation, MonthlyDashboard } from '@/app/types/dashboard';


const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

function statusMessage(status: PaceStatus, hasBudget: boolean): { text: string; tone: 'good' | 'warn' | 'bad' | 'neutral' } {
  switch (status) {
    case 'OVER_BUDGET':
      return { text: 'O gasto já passou do orçamento do mês', tone: 'bad' };
    case 'AHEAD':
      return { text: hasBudget ? 'Gastando mais rápido do que o orçamento comporta' : 'Gastando mais do que no mês passado até aqui', tone: 'warn' };
    case 'ON_TRACK':
      return { text: hasBudget ? 'No ritmo do orçamento' : 'Em linha com o mês passado', tone: 'good' };
    case 'FINISHED':
      return { text: 'Mês encerrado', tone: 'neutral' };
    case 'NOT_STARTED':
      return { text: 'Este mês ainda não começou', tone: 'neutral' };
    default:
      return { text: 'Sem despesas registradas neste mês', tone: 'neutral' };
  }
}

const toneClass = {
  good: 'bg-[var(--surface-subtle)] text-[var(--income)]',
  warn: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  bad: 'bg-[var(--danger-subtle)] text-[var(--expense)]',
  neutral: 'bg-[var(--surface-subtle)] text-[var(--text-muted)]',
} as const;

function PaceChart({ pace, showValues, currency }: { pace: MonthPace; showValues: boolean; currency: string }) {
  const { ref: chartRef, width: WIDTH } = useChartWidth(640);
  const narrow = WIDTH < 520;
  const HEIGHT = narrow ? 200 : 210;
  // Rótulos compactos como "12,5 mil" precisam de ~56px na fonte de 11px; menos que isso corta o início.
  const PAD = { left: narrow ? 52 : 58, right: 14, top: 16, bottom: 24 };
  const { daysInMonth, elapsedDays, cumulative, previousCumulative, budget, projected, spent } = pace;
  const max = Math.max(budget, projected ?? 0, spent, previousCumulative[previousCumulative.length - 1] ?? 0, 1_000);
  const top = max * 1.08;
  const x = (day: number) => PAD.left + ((day - 1) / Math.max(daysInMonth - 1, 1)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - value / top) * (HEIGHT - PAD.top - PAD.bottom);
  const line = (values: number[]) => values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index + 1).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');
  // Arredondar em múltiplos de R$ 10 pode repetir valores quando o gasto é pequeno; o eixo mostra só valores distintos.
  const ticks = [...new Set([0, 0.5, 1].map((fraction) => Math.round((top * fraction) / 1000) * 1000))];
  const xTicks = [1, Math.ceil(daysInMonth / 4), Math.ceil(daysInMonth / 2), Math.ceil((daysInMonth * 3) / 4), daysInMonth];
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const hasToday = elapsedDays > 0;
  const mono = 'var(--font-numeric), monospace';
  const dayXs = Array.from({ length: daysInMonth }, (_, index) => x(index + 1));
  const { activeIndex, handlers } = useChartScrub(dayXs, WIDTH);
  const activeDay = activeIndex === null ? null : activeIndex + 1;
  const activeSpent = activeDay !== null && activeDay <= elapsedDays ? (cumulative[activeDay - 1] ?? null) : null;
  const activePrevious = activeDay !== null ? (previousCumulative[activeDay - 1] ?? null) : null;

  return (
    <div ref={chartRef}>
    <p className="mb-1 min-h-6 text-sm text-[var(--text-muted)]" aria-live="polite">
      {activeDay === null ? (
        'Passe o cursor ou toque no gráfico para ver o gasto de cada dia.'
      ) : (
        <>
          Dia {activeDay}:{' '}
          <strong className="money text-[var(--foreground)]">{activeSpent !== null ? money(activeSpent) : 'ainda não chegou'}</strong>
          {activePrevious !== null && <> · mês passado <span className="money">{money(activePrevious)}</span></>}
        </>
      )}
    </p>
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ height: HEIGHT }}
      className="block w-full touch-pan-y"
      {...handlers}
      role="img"
      aria-label={`Gasto acumulado no mês: ${money(spent)} em ${elapsedDays} de ${daysInMonth} dias${budget > 0 ? `, orçamento de ${money(budget)}` : ''}${projected !== null ? `, projeção de ${money(projected)} no fim do mês` : ''}.`}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeOpacity={tick === 0 ? 1 : 0.7} />
          {showValues && (
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" fontFamily={mono}>
              {compact.format(tick / 100)}
            </text>
          )}
        </g>
      ))}
      {xTicks.map((day, index) => (
        <text key={`${day}-${index}`} x={x(day)} y={HEIGHT - 6} textAnchor={index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--text-muted)" fontFamily={mono}>
          {day}
        </text>
      ))}

      {budget > 0 && (
        <g>
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(budget)} y2={y(budget)} stroke="var(--warning)" strokeWidth="1.2" strokeDasharray="5 4" />
          <text x={WIDTH - PAD.right} y={y(budget) - 6} textAnchor="end" fontSize="11" fill="var(--warning)">orçamento</text>
        </g>
      )}
      {previousCumulative.length > 1 && (
        <path d={line(previousCumulative)} fill="none" stroke="var(--text-subtle)" strokeWidth="1.4" strokeOpacity="0.8" />
      )}
      {hasToday && cumulative.length > 0 && (
        <>
          <path d={`${line(cumulative)} L ${x(elapsedDays)} ${y(0)} L ${x(1)} ${y(0)} Z`} fill="var(--orbit-primary)" fillOpacity="0.13" />
          <path d={line(cumulative)} fill="none" stroke="var(--orbit-primary)" strokeWidth="2.2" strokeLinejoin="round" />
        </>
      )}
      {hasToday && projected !== null && elapsedDays < daysInMonth && (
        <path d={`M ${x(elapsedDays)} ${y(spent)} L ${x(daysInMonth)} ${y(projected)}`} fill="none" stroke="var(--orbit-primary)" strokeWidth="1.6" strokeDasharray="3 4" />
      )}
      {hasToday && (
        <circle cx={x(elapsedDays)} cy={y(spent)} r="4.5" fill="var(--orbit-primary)" stroke="var(--surface)" strokeWidth="2" />
      )}
      {activeDay !== null && (
        <ChartCursor x={x(activeDay)} y={y(activeSpent ?? activePrevious ?? 0)} top={PAD.top} bottom={HEIGHT - PAD.bottom} />
      )}
    </svg>
    </div>
  );
}

export function MonthPaceCard({
  data,
  relation,
  today,
  showValues,
}: {
  data: MonthlyDashboard;
  relation: DashboardPeriodRelation;
  /** Dia do mês de hoje (referência atual), usado quando o mês selecionado é o atual. */
  today: number;
  showValues: boolean;
}) {
  const pace = buildMonthPace({
    current: data.spending.current,
    previous: data.spending.previous,
    budget: data.planning.budget,
    relation,
    today,
  });
  const previous = data.comparison.previousPeriod;
  const status = statusMessage(pace.status, data.planning.budget > 0);
  const money = (cents: number) => displayMoney(cents, showValues, data.currency);
  const periodValue = `${data.period.year}-${String(data.period.month).padStart(2, '0')}`;
  // Sem orçamento, "Disponível" seria só 0 − gasto: um negativo que não representa estouro.
  const hasBudget = data.planning.budget > 0;
  const hasPlanning = hasBudget || data.planning.committed > 0;

  return (
    <section
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-[14px] sm:p-5"
      aria-labelledby="dashboard-pace-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="dashboard-pace-title" className="text-lg font-bold">Gastos do mês, dia a dia</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{monthLabel(periodValue)} comparado ao mês anterior.</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass[status.tone]}`}>{status.text}</span>
      </div>

      <div className="mt-4">
        <PaceChart pace={pace} showValues={showValues} currency={data.currency} />
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[var(--orbit-primary)]" aria-hidden="true" />Este mês</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[var(--text-subtle)]" aria-hidden="true" />{monthLabel(`${previous.year}-${String(previous.month).padStart(2, '0')}`)}</span>
          {pace.budget > 0 && <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t border-dashed border-[var(--warning)]" aria-hidden="true" />Orçamento</span>}
          {pace.projected !== null && (
            <span className="ml-auto">
              Projeção no ritmo atual: <strong className="money text-[var(--foreground)]">{money(pace.projected)}</strong>
            </span>
          )}
        </div>
      </div>

      {hasPlanning && (
        <div className={`mt-4 grid gap-2 ${hasBudget ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
          {hasBudget && <PlanningMetric label="Orçamento" value={money(data.planning.budget)} />}
          <PlanningMetric label="Realizado" value={money(data.planning.realized)} />
          <PlanningMetric label="Comprometido" value={money(data.planning.committed)} />
          {hasBudget && <PlanningMetric label="Disponível" value={money(data.planning.available)} danger={data.planning.available < 0} />}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <Link href="/categorias" className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--orbit-primary)]">
          {hasBudget ? 'Ajustar orçamento' : 'Definir orçamento'}
        </Link>
      </div>
    </section>
  );
}
