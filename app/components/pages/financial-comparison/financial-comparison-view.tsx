'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';

import { fromSide, riseInView } from '@/app/components/pages/financial-comparison/comparison-motion';
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
import { CARD_EASE, CountUp, reducedTransition } from '@/app/components/ui/motion';
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
  const reduce = useReducedMotion();
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
    // `overflow-x-clip`: os cartões que entram de lado não criam barra de rolagem horizontal durante a animação.
    <div className="space-y-4 overflow-x-clip">
      <motion.section
        initial={reduce ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: CARD_EASE, delay: 0.35 }}
        className={`${cardClassName} grid gap-3.5 p-4 shadow-[var(--shadow-surface)] sm:p-6`}
        aria-label="Resumo da comparação"
      >
        {/* A frase do veredito aparece palavra por palavra, saindo do desfoque, como uma conclusão sendo lida. */}
        <p className="max-w-[48ch] text-balance text-xl font-bold leading-snug tracking-tight sm:text-2xl">
          {(() => {
            let word = 0;
            return buildVerdict(data, basis, money, labels).map((segment, index) => (
              <span key={index} className={`${segment.money ? 'money ' : ''}${segment.tone ? TONE_TEXT[segment.tone] : ''}`}>
                {segment.text.split(/( +)/).map((token, tokenIndex) =>
                  token === '' || /^ +$/.test(token) ? (
                    token
                  ) : (
                    <motion.span
                      key={tokenIndex}
                      // Fica inline (sem deslocamento) para a quebra de linha ser a do texto normal: vírgula e ponto não vão sozinhos para a linha de baixo.
                      initial={reduce ? false : { opacity: 0, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      transition={reducedTransition(reduce, { duration: 0.4, ease: CARD_EASE, delay: 0.6 + word++ * 0.04 })}
                    >
                      {token}
                    </motion.span>
                  ),
                )}
              </span>
            ));
          })()}
        </p>
        {!sameLength && (
          <motion.div
            role="note"
            initial={reduce ? false : { opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 1 }}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3.5 py-3 text-sm font-semibold text-[var(--warning)]"
          >
            <span>
              Os períodos têm tamanhos diferentes ({data.a.months} e {data.b.months} meses). Totais não são equivalentes; use a média mensal para comparar ritmo.
            </span>
            <span className="flex gap-2" role="group" aria-label="Base da comparação">
              <Chip selected={basis === 'total'} onClick={() => onOverride('total')}>Total</Chip>
              <Chip selected={basis === 'average'} onClick={() => onOverride('average')}>Média mensal</Chip>
            </span>
          </motion.div>
        )}
        {data.coverage.overlaps && (
          <p className="text-sm text-[var(--text-muted)]">Os períodos se sobrepõem; meses compartilhados entram nos dois lados da comparação.</p>
        )}
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={basis === 'total' ? 'Totais dos dois períodos' : 'Média mensal dos dois períodos'}>
        {rows.map((row, index) => (
          <MetricCard
            key={row.key}
            index={index}
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
            index={rows.length}
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
          <motion.article {...fromSide(rows.length, reduce)} className={`${cardClassName} grid content-start gap-1 p-4`}>
            <h3 className="text-sm font-bold">Patrimônio no fim</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {data.a.netWorthStatus === 'ERROR' || data.b.netWorthStatus === 'ERROR'
                ? 'Temporariamente indisponível para um dos períodos. Receitas e despesas continuam válidas.'
                : 'Sem ponto patrimonial comparável nessa moeda para um dos períodos.'}
            </p>
          </motion.article>
        )}
      </section>

      <motion.section {...riseInView(reduce)} className={cardClassName} aria-labelledby="comparison-movers-heading">
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
              {visibleMovers.map((category, index) => (
                <motion.li
                  key={category.id}
                  {...fromSide(index, reduce)}
                  whileHover="hover"
                  whileTap={{ scale: 0.97 }}
                  className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3"
                >
                  <motion.span
                    className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)]"
                    style={{ backgroundColor: category.color }}
                    aria-hidden="true"
                    variants={{ hover: { rotate: [0, -10, 8, 0], scale: 1.12, transition: { duration: 0.5 } } }}
                  >
                    <IconRenderer iconName={category.icon || 'tag'} size={16} className="text-white" />
                  </motion.span>
                  <span className="grid min-w-0 gap-2">
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 break-words text-sm font-semibold">{category.name}</span>
                      <motion.span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${TONE_PILL[deltaTone(category.metric, true)]}`}
                        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.35 + Math.min(index, 8) * 0.07 }}
                      >
                        {category.metric.difference === 0
                          ? 'Sem mudança'
                          : (category.metric.difference > 0 ? '▲ ' : '▼ ') +
                            (category.metric.percentage === null ? 'novo' : formatPercent(Math.abs(category.metric.percentage)))}
                      </motion.span>
                    </span>
                    <span className="grid gap-1" aria-hidden="true">
                      <PairBar width={category.widths[0]} tone="a" size="sm" delay={0.3 + Math.min(index, 8) * 0.07} />
                      <PairBar width={category.widths[1]} tone="b" size="sm" delay={0.45 + Math.min(index, 8) * 0.07} />
                    </span>
                    <span className="money text-sm text-[var(--text-muted)]">
                      {money(category.a)}{' '}
                      <motion.span className="inline-block" aria-hidden="true" variants={{ hover: { x: 5 } }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>→</motion.span>{' '}
                      <span className="font-semibold text-[var(--foreground)]">{money(category.b)}</span>
                    </span>
                  </span>
                </motion.li>
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
      </motion.section>

      <motion.details {...riseInView(reduce)} className={`${cardClassName} group`}>
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
      </motion.details>
    </div>
  );
}

function MetricCard({
  index,
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
  index: number;
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
  const reduce = useReducedMotion();
  const [widthA, widthB] = pairWidths(a, b);
  return (
    // O cartão vem de um lado (alternando) e o conteúdo reage ao hover/toque: as barras engordam e a bolinha pulsa.
    <motion.article {...fromSide(index, reduce)} whileHover="hover" whileTap="hover" className={`${cardClassName} grid content-start gap-3 p-4`}>
      <div className="grid gap-1.5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <motion.span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: dot }}
            aria-hidden="true"
            variants={{ hover: { scale: [1, 2, 1], transition: { duration: 0.5 } } }}
          />
          {title}
        </h3>
        <motion.span
          className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE_PILL[deltaTone(metric, lowerIsBetter)]}`}
          initial={reduce ? false : { y: -14, scale: 0.7, opacity: 0 }}
          whileInView={{ y: 0, scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.5 + index * 0.08 }}
        >
          {deltaLabel(metric, money)}
        </motion.span>
      </div>
      <PairValue who={labelA} amount={a} money={money} width={widthA} tone="a" delay={0.3 + index * 0.08} />
      <PairValue who={labelB} amount={b} money={money} width={widthB} tone="b" delay={0.5 + index * 0.08} />
    </motion.article>
  );
}

function PairValue({ who, amount, money, width, tone, delay }: { who: string; amount: number; money: (cents: number) => string; width: number; tone: 'a' | 'b'; delay: number }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-muted)]">{who}</span>
        <motion.span className="money origin-right truncate text-base font-semibold" variants={{ hover: { scale: 1.07, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
          <CountUp amount={amount} format={money} />
        </motion.span>
      </div>
      <PairBar width={width} tone={tone} delay={delay} />
    </div>
  );
}

function PairBar({ width, tone, size = 'md', delay = 0 }: { width: number; tone: 'a' | 'b'; size?: 'sm' | 'md'; delay?: number }) {
  const reduce = useReducedMotion();

  return (
    <motion.span
      className={`block overflow-hidden rounded-full bg-[var(--surface-subtle)] ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
      aria-hidden="true"
      variants={{ hover: { scaleY: 1.5, transition: { type: 'spring', stiffness: 400, damping: 18 } } }}
    >
      {/* A barra de A cresce primeiro e a de B logo depois: o "duelo" se arma na ordem. */}
      <motion.span
        className={`block h-full rounded-full ${tone === 'a' ? 'bg-[var(--border-strong)]' : 'bg-[var(--primary)]'}`}
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: width + '%' }}
        viewport={{ once: true }}
        transition={reducedTransition(reduce, { duration: 0.9, ease: CARD_EASE, delay })}
      />
    </motion.span>
  );
}
