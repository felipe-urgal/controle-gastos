'use client';

import { useState } from 'react';

import {
  buildVerdict,
  deltaLabel,
  deltaTone,
  metricRows,
  pairWidths,
  sortedMovers,
  type ComparisonBasis,
  type DeltaTone,
} from '@/app/components/pages/financial-comparison/financial-comparison-model';
import { Button, Chip, IconRenderer } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { ComparisonLogicalDate, FinancialComparisonData } from '@/app/types/financial-comparison';

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]';
const VISIBLE_MOVERS = 5;

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
  override,
  onOverride,
}: {
  data: FinancialComparisonData;
  showValues: boolean;
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
      <section className="grid gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6" aria-labelledby="comparison-verdict-label">
        <p id="comparison-verdict-label" className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Em resumo</p>
        <p className="max-w-[34ch] text-balance text-xl font-bold leading-snug tracking-tight sm:text-2xl">
          {buildVerdict(data, basis, money).map((segment, index) => (
            <span key={index} className={`${segment.money ? 'money ' : ''}${segment.tone ? TONE_TEXT[segment.tone] : ''}`}>
              {segment.text}
            </span>
          ))}
        </p>
        {!sameLength && (
          <div role="note" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3.5 py-3 text-[13px] font-semibold text-[var(--warning)]">
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
          <p className="text-[13px] text-[var(--text-muted)]">Os períodos se sobrepõem; meses compartilhados entram nos dois lados da comparação.</p>
        )}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <section className={cardClassName} aria-labelledby="comparison-flow-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1.5 pt-4 sm:px-5">
              <h2 id="comparison-flow-heading" className="text-base font-bold">Receitas, despesas e resultado</h2>
              <p className="text-xs text-[var(--text-muted)]">{basis === 'total' ? 'Totais dos dois períodos' : 'Média mensal dos dois períodos'}</p>
            </div>
            {rows.map((row) => {
              const [widthA, widthB] = pairWidths(row.a, row.b);
              return (
                <article key={row.key} className="grid gap-2.5 border-t border-[var(--border)] px-4 py-4 first-of-type:border-t-0 sm:px-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
                    <h3 className="text-sm font-bold">{row.label}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE_PILL[deltaTone(row.metric, row.lowerIsBetter)]}`}>
                      {deltaLabel(row.metric, money)}
                    </span>
                  </div>
                  <div className="grid gap-1.5">
                    <BarRow who="A" width={widthA} amount={money(row.a)} tone="a" />
                    <BarRow who="B" width={widthB} amount={money(row.b)} tone="b" />
                  </div>
                </article>
              );
            })}
          </section>

          <section className={cardClassName} aria-labelledby="comparison-movers-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1 pt-4 sm:px-5">
              <h2 id="comparison-movers-heading" className="text-base font-bold">O que mais mudou nas despesas</h2>
              <p className="text-xs text-[var(--text-muted)]">Ordenado pela maior diferença</p>
            </div>
            {movers.length === 0 ? (
              <p className="px-4 pb-5 pt-2 text-sm text-[var(--text-muted)] sm:px-5">Sem despesas nos períodos selecionados.</p>
            ) : (
              <>
                <p className="px-4 pb-1 text-xs text-[var(--text-muted)] sm:px-5">
                  Inclui divisões e trata créditos de cartão como redução da despesa correspondente.
                </p>
                <ul className="grid gap-0.5 px-2 pb-3 pt-1 sm:px-3">
                  {visibleMovers.map((category) => (
                    <li key={category.id} className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)]" style={{ backgroundColor: category.color }} aria-hidden="true">
                        <IconRenderer iconName={category.icon || 'tag'} size={16} className="text-white" />
                      </span>
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold">{category.name}</span>
                        <span className="mt-1.5 grid gap-[3px]" aria-hidden="true">
                          <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]"><span className="block h-full rounded-full bg-[var(--border-strong)]" style={{ width: category.widths[0] + '%' }} /></span>
                          <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]"><span className="block h-full rounded-full bg-[var(--orbit-primary)]" style={{ width: category.widths[1] + '%' }} /></span>
                        </span>
                      </span>
                      <span className="grid justify-items-end gap-1 text-right">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONE_PILL[deltaTone(category.metric, true)]}`}>
                          {category.metric.difference === 0 ? 'Sem mudança' : (category.metric.difference > 0 ? '▲ ' : '▼ ') + (category.metric.percentage === null ? 'novo' : Math.abs(category.metric.percentage) + '%')}
                        </span>
                        <span className="money text-xs text-[var(--text-muted)]">{money(category.a)} → {money(category.b)}</span>
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
        </div>

        <div className="min-w-0 space-y-4">
          <section className={cardClassName} aria-labelledby="comparison-networth-heading">
            <div className="px-4 pb-2 pt-4 sm:px-5">
              <h2 id="comparison-networth-heading" className="text-base font-bold">Patrimônio no fim do período</h2>
              <p className="text-xs text-[var(--text-muted)]">Saldo realizado das contas</p>
            </div>
            {hasNetWorth ? (
              <div className="grid gap-3 px-4 pb-5 sm:px-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
                  <div>
                    <p className="text-[13px] text-[var(--text-muted)]">A · {formatLogicalDate(data.a.netWorthAsOf)}</p>
                    <p className="money break-words text-[17px] font-semibold">{money(data.a.netWorthEnd!)}</p>
                  </div>
                  <span className="text-[var(--text-muted)]" aria-hidden="true">→</span>
                  <div>
                    <p className="text-[13px] text-[var(--text-muted)]">B · {formatLogicalDate(data.b.netWorthAsOf)}</p>
                    <p className="money break-words text-[17px] font-semibold">{money(data.b.netWorthEnd!)}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${TONE_TEXT[deltaTone(netWorth)]}`}>{deltaLabel(netWorth, money)}</p>
              </div>
            ) : (
              <p className="px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">
                {data.a.netWorthStatus === 'ERROR' || data.b.netWorthStatus === 'ERROR'
                  ? 'Patrimônio temporariamente indisponível para um dos períodos. O comparativo de receitas e despesas continua válido.'
                  : 'Sem ponto patrimonial comparável nessa moeda para um dos períodos.'}
              </p>
            )}
          </section>
        </div>
      </div>

      <details className={`${cardClassName} group`}>
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-5 [&::-webkit-details-marker]:hidden">
          Como comparamos
          <span className="text-lg text-[var(--text-muted)] group-open:hidden" aria-hidden="true">+</span>
          <span className="hidden text-lg text-[var(--text-muted)] group-open:inline" aria-hidden="true">−</span>
        </summary>
        <div className="grid max-w-[78ch] gap-2.5 px-4 pb-5 text-[13px] text-[var(--text-muted)] sm:px-5">
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

function BarRow({ who, width, amount, tone }: { who: string; width: number; amount: string; tone: 'a' | 'b' }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5">
      <span className="text-xs font-extrabold text-[var(--text-muted)]">{who}</span>
      <span className="block h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-hidden="true">
        <span className={`block h-full rounded-full ${tone === 'a' ? 'bg-[var(--border-strong)]' : 'bg-[var(--orbit-primary)]'}`} style={{ width: width + '%' }} />
      </span>
      <span className="money min-w-24 text-right text-sm font-semibold sm:min-w-28">{amount}</span>
    </div>
  );
}
