'use client';

import { useState } from 'react';

import {
  buildVerdict,
  deltaLabel,
  deltaTone,
  formatPercent,
  metricRows,
  pairWidths,
  sortedMovers,
  type ComparisonBasis,
  type DeltaTone,
} from '@/app/components/pages/financial-comparison/financial-comparison-model';
import { Button, Chip, IconRenderer } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  ComparisonLogicalDate,
  FinancialComparisonData,
  FinancialComparisonMetric,
} from '@/app/types/financial-comparison';

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]';
const VISIBLE_MOVERS = 6;

const TONE_TEXT: Record<DeltaTone, string> = {
  good: 'text-[var(--income)]',
  bad: 'text-[var(--expense)]',
  flat: 'text-[var(--text-muted)]',
};
const TONE_PILL: Record<DeltaTone, string> = {
  good: 'bg-[var(--primary-subtle)] text-[var(--income)]',
  bad: 'bg-[var(--danger-subtle)] text-[var(--expense)]',
  flat: 'bg-[var(--surface-subtle)] text-[var(--text-muted)]',
};

function formatLogicalDate(date: ComparisonLogicalDate) {
  return [date.day, date.month].map((part) => String(part).padStart(2, '0')).join('/') + '/' + date.year;
}

export default function FinancialComparisonView({
  data,
  showValues,
  labels,
  override,
  onOverride,
}: {
  data: FinancialComparisonData;
  showValues: boolean;
  /** Nome legível de cada período (ex.: "jan. – out. de 2026"), usado na frase de resumo. */
  labels: { a: string; b: string };
  /** Base escolhida pelo usuário; fica na página para sobreviver à troca de moeda ou período. */
  override: ComparisonBasis | null;
  onOverride: (basis: ComparisonBasis) => void;
}) {
  const sameLength = data.coverage.sameLength;
  const [showAll, setShowAll] = useState(false);
  const basis: ComparisonBasis = sameLength ? 'total' : (override ?? 'average');
  const money = (cents: number) => (showValues ? formatCurrency(cents, data.currency) : '••••');
  const rows = metricRows(data, basis);
  const movers = sortedMovers(data, basis);
  const visibleMovers = showAll ? movers : movers.slice(0, VISIBLE_MOVERS);
  const netWorth = data.difference.netWorthEnd;
  const hasNetWorth = data.a.netWorthEnd !== null && data.b.netWorthEnd !== null && netWorth !== null;

  return (
    <div className="space-y-4">
      <section className={`${cardClassName} grid gap-3.5 p-4 shadow-[var(--shadow-surface)] sm:p-6`} aria-label="Resumo da comparação">
        <p className="max-w-[48ch] text-balance text-xl font-bold leading-snug tracking-tight sm:text-2xl">
          {buildVerdict(data, basis, money, labels).map((segment, index) => (
            <span key={index} className={`${segment.money ? 'money ' : ''}${segment.tone ? TONE_TEXT[segment.tone] : ''}`}>
              {segment.text}
            </span>
          ))}
        </p>
        {!sameLength && (
          <div role="note" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3.5 py-3 text-sm font-semibold text-[var(--warning)]">
            <span>
              Os períodos têm tamanhos diferentes ({data.a.months} e {data.b.months} meses). Totais não são equivalentes; use a média mensal para comparar ritmo.
            </span>
            <span className="flex gap-2" role="group" aria-label="Base da comparação">
              <Chip selected={basis === 'total'} onClick={() => onOverride('total')}>Total</Chip>
              <Chip selected={basis === 'average'} onClick={() => onOverride('average')}>Média mensal</Chip>
            </span>
          </div>
        )}
        {data.coverage.overlaps && (
          <p className="text-sm text-[var(--text-muted)]">Os períodos se sobrepõem; meses compartilhados entram nos dois lados da comparação.</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={basis === 'total' ? 'Totais dos dois períodos' : 'Média mensal dos dois períodos'}>
        {rows.map((row) => (
          <MetricCard
            key={row.key}
            title={row.label}
            dot={row.key === 'income' ? 'var(--income)' : row.key === 'expense' ? 'var(--expense)' : 'var(--text-muted)'}
            a={row.a}
            b={row.b}
            metric={row.metric}
            lowerIsBetter={row.lowerIsBetter}
            money={money}
          />
        ))}
        {hasNetWorth ? (
          <MetricCard
            title="Patrimônio no fim"
            dot="var(--primary)"
            a={data.a.netWorthEnd!}
            b={data.b.netWorthEnd!}
            labelA={`A · ${formatLogicalDate(data.a.netWorthAsOf)}`}
            labelB={`B · ${formatLogicalDate(data.b.netWorthAsOf)}`}
            metric={netWorth}
            lowerIsBetter={false}
            money={money}
          />
        ) : (
          <article className={`${cardClassName} grid content-start gap-1 p-4`}>
            <h3 className="text-sm font-bold">Patrimônio no fim</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {data.a.netWorthStatus === 'ERROR' || data.b.netWorthStatus === 'ERROR'
                ? 'Temporariamente indisponível para um dos períodos. Receitas e despesas continuam válidas.'
                : 'Sem ponto patrimonial comparável nessa moeda para um dos períodos.'}
            </p>
          </article>
        )}
      </section>

      <section className={cardClassName} aria-labelledby="comparison-movers-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pb-1 pt-4 sm:px-5">
          <h2 id="comparison-movers-heading" className="text-base font-bold">O que mais mudou nas despesas</h2>
          <p className="text-xs text-[var(--text-muted)]">Ordenado pela maior diferença</p>
        </div>
        {movers.length === 0 ? (
          <p className="px-4 pb-5 pt-2 text-sm text-[var(--text-muted)] sm:px-5">Sem despesas nos períodos selecionados.</p>
        ) : (
          <>
            <p className="px-4 pb-2 text-xs text-[var(--text-muted)] sm:px-5">
              Inclui divisões e trata créditos de cartão como redução da despesa correspondente.
            </p>
            <ul className="grid gap-2.5 px-3 pb-3 sm:px-4 lg:grid-cols-2">
              {visibleMovers.map((category) => (
                <li key={category.id} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                  <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)]" style={{ backgroundColor: category.color }} aria-hidden="true">
                    <IconRenderer iconName={category.icon || 'tag'} size={16} className="text-white" />
                  </span>
                  <span className="grid min-w-0 gap-2">
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 break-words text-sm font-semibold">{category.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${TONE_PILL[deltaTone(category.metric, true)]}`}>
                        {category.metric.difference === 0
                          ? 'Sem mudança'
                          : (category.metric.difference > 0 ? '▲ ' : '▼ ') +
                            (category.metric.percentage === null ? 'novo' : formatPercent(Math.abs(category.metric.percentage)))}
                      </span>
                    </span>
                    <span className="grid gap-1" aria-hidden="true">
                      <PairBar width={category.widths[0]} tone="a" size="sm" />
                      <PairBar width={category.widths[1]} tone="b" size="sm" />
                    </span>
                    <span className="money text-sm text-[var(--text-muted)]">
                      {money(category.a)} → <span className="font-semibold text-[var(--foreground)]">{money(category.b)}</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {movers.length > VISIBLE_MOVERS && (
              <div className="border-t border-[var(--border)] p-1.5">
                <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setShowAll((value) => !value)}>
                  {showAll ? 'Mostrar menos' : `Ver todas as ${movers.length} categorias`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <details className={`${cardClassName} group`}>
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
          Como comparamos
          <span className="text-lg text-[var(--text-muted)] group-open:hidden" aria-hidden="true">+</span>
          <span className="hidden text-lg text-[var(--text-muted)] group-open:inline" aria-hidden="true">−</span>
        </summary>
        <div className="grid max-w-[78ch] gap-2.5 px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">
          <p><strong className="text-[var(--foreground)]">A é a base.</strong> Cada diferença é B − A, e não mostramos percentual quando A é zero.</p>
          <p><strong className="text-[var(--foreground)]">Só o realizado conta.</strong> Despesas incluem divisões e tratam créditos de cartão como redução da despesa correspondente.</p>
          <p><strong className="text-[var(--foreground)]">Períodos de tamanhos diferentes</strong> são comparados pela média mensal, que divide cada total pela quantidade exata de meses do período.</p>
          <p><strong className="text-[var(--foreground)]">Patrimônio</strong> usa a base {data.netWorthMethodology.basis}: série transacional comparável, sem reconstruir mercado retroativo.</p>
          <p>Referência dos dados: {formatLogicalDate(data.asOf)}.</p>
        </div>
      </details>
    </div>
  );
}

function MetricCard({
  title,
  dot,
  a,
  b,
  labelA = 'A',
  labelB = 'B',
  metric,
  lowerIsBetter,
  money,
}: {
  title: string;
  dot: string;
  a: number;
  b: number;
  labelA?: string;
  labelB?: string;
  metric: FinancialComparisonMetric;
  lowerIsBetter: boolean;
  money: (cents: number) => string;
}) {
  const [widthA, widthB] = pairWidths(a, b);
  return (
    <article className={`${cardClassName} grid content-start gap-3 p-4`}>
      <div className="grid gap-1.5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" />
          {title}
        </h3>
        <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE_PILL[deltaTone(metric, lowerIsBetter)]}`}>
          {deltaLabel(metric, money)}
        </span>
      </div>
      <PairValue who={labelA} amount={money(a)} width={widthA} tone="a" />
      <PairValue who={labelB} amount={money(b)} width={widthB} tone="b" />
    </article>
  );
}

function PairValue({ who, amount, width, tone }: { who: string; amount: string; width: number; tone: 'a' | 'b' }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-muted)]">{who}</span>
        <span className="money truncate text-base font-semibold">{amount}</span>
      </div>
      <PairBar width={width} tone={tone} />
    </div>
  );
}

function PairBar({ width, tone, size = 'md' }: { width: number; tone: 'a' | 'b'; size?: 'sm' | 'md' }) {
  return (
    <span className={`block overflow-hidden rounded-full bg-[var(--surface-subtle)] ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`} aria-hidden="true">
      <span className={`block h-full rounded-full ${tone === 'a' ? 'bg-[var(--border-strong)]' : 'bg-[var(--primary)]'}`} style={{ width: width + '%' }} />
    </span>
  );
}
