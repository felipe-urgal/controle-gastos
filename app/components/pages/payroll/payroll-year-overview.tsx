'use client';

import { RiseSection } from '@/app/components/ui/motion';
import { motion, useReducedMotion } from 'framer-motion';

import { useChartWidth } from '@/app/components/charts/use-chart-width';
import { useChartScrub } from '@/app/components/charts/use-chart-scrub';
import { monthlySeries, summarizeYear, visibleMonths } from '@/app/components/pages/payroll/payroll-year-model';
import { PopBox } from '@/app/components/ui/motion';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { payrollMoney } from '@/app/lib/payroll/payroll-presentation';
import type { PayrollSummary } from '@/app/types/payroll';

const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export function PayrollYearOverview({
  items,
  year,
  hasMore,
  showValues,
}: {
  items: PayrollSummary[];
  year: number;
  hasMore: boolean;
  showValues: boolean;
}) {
  const totals = summarizeYear(items);
  const compactChart = useMediaQuery('(max-width: 639px)');
  const money = (cents: number | null) => payrollMoney(cents, showValues);

  return (
    <RiseSection aria-labelledby="payroll-hero-label" className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div>
        <p id="payroll-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">
          Líquido recebido em {year}
        </p>
        <strong className="money mt-2 block break-words text-3xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
          {money(totals.netPaidCents)}
        </strong>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Soma de {totals.netKnownCount} {totals.netKnownCount === 1 ? 'competência com líquido conhecido' : 'competências com líquido conhecido'}.
          {totals.netUnknownCount > 0 &&
            ` ${totals.netUnknownCount} ${totals.netUnknownCount === 1 ? 'fica' : 'ficam'} de fora até o documento ser importado ou conciliado.`}
        </p>
      </div>

      <div className={`grid grid-cols-2 gap-2 sm:gap-3 ${totals.reviewCount > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <Stat label="Renda bruta" value={money(totals.grossCents)} detail={`em ${totals.grossKnownCount} ${totals.grossKnownCount === 1 ? 'competência' : 'competências'}`} />
        <Stat label="IRRF retido" value={money(totals.irrfCents)} detail={totals.irrfMissingCount > 0 ? `${totals.irrfMissingCount} sem valor` : 'todas informadas'} />
        <Stat label="Média líquida" value={money(totals.averageNetCents)} detail="das competências conhecidas" className={totals.reviewCount === 0 ? 'col-span-2 lg:col-span-1' : ''} />
        {totals.reviewCount > 0 && (
          <Stat label="Para revisar" value={String(totals.reviewCount)} detail={totals.reviewCount === 1 ? 'competência' : 'competências'} />
        )}
      </div>

      {hasMore && (
        <p className="rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-4 py-3 text-sm">
          Este ano tem mais competências do que a tela carrega de uma vez. Totais e gráfico cobrem só as mais recentes.
        </p>
      )}

      <MonthlyChart items={items} year={year} showValues={showValues} monthsToShow={compactChart ? 6 : null} compact={compactChart} />
    </RiseSection>
  );
}

function Stat({ label, value, detail, className = '' }: { label: string; value: string; detail: string; className?: string }) {
  return (
    <PopBox whileHover="hover" className={`grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-3.5 ${className}`}>
      <span className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">{label}</span>
      <motion.span className="money origin-left truncate text-base font-semibold sm:text-xl" variants={{ hover: { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
        {value}
      </motion.span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </PopBox>
  );
}

function MonthlyChart({
  items,
  year,
  showValues,
  monthsToShow,
  compact: isCompact,
}: {
  items: PayrollSummary[];
  year: number;
  showValues: boolean;
  monthsToShow: number | null;
  compact: boolean;
}) {
  const reduce = useReducedMotion();
  const series = visibleMonths(monthlySeries(items, year), monthsToShow);
  // Largura lógica próxima da real: no celular os rótulos mantêm tamanho legível.
  const { ref: chartRef, width } = useChartWidth(isCompact ? 360 : 760);
  const narrow = width < 520;
  const height = narrow ? 220 : 240;
  const pad = { left: narrow ? 44 : 56, right: 10, top: 14, bottom: 28 };
  const fontSize = narrow ? 12 : 11;
  const maxBar = Math.max(1, ...series.map((point) => point.barCents));
  const top = maxBar * 1.1;
  const slot = (width - pad.left - pad.right) / series.length;
  const x = (index: number) => pad.left + slot * index + slot / 2;
  const y = (cents: number) => pad.top + (1 - cents / top) * (height - pad.top - pad.bottom);
  const ticks = [0, 1, 2, 3].map((step) => (top * step) / 3);
  const { activeIndex, handlers } = useChartScrub(series.map((_, index) => x(index)), width);
  const lastWithData = series.reduce((latest, point, index) => (point.status !== 'EMPTY' ? index : latest), series.length - 1);
  const shownIndex = activeIndex ?? lastWithData;
  const shown = series[shownIndex];
  const money = (cents: number | null) => payrollMoney(cents, showValues);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[52ch]">
          <h2 className="text-sm font-bold">Líquido por mês</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Passe o cursor ou toque numa barra. Meses sem documento ficam vazios; meses incompletos aparecem tracejados.
          </p>
        </div>
        <div className="min-h-[3.25rem] text-right" aria-live="polite">
          <span className="block text-xs font-semibold text-[var(--text-muted)]">
            {shown ? `${monthNames[shown.month - 1]}/${year}` : '—'}
            {activeIndex === null ? ' (mais recente)' : ''}
          </span>
          <strong className="money block text-lg font-semibold">
            {!shown || shown.status === 'EMPTY' ? 'Sem documento' : shown.netPaidCents === null ? 'Líquido incompleto' : money(shown.netPaidCents)}
          </strong>
          {shown && shown.status !== 'EMPTY' && (
            <span className="text-xs text-[var(--text-muted)]">
              {shown.netPaidCents === null ? `Adiantamento: ${money(shown.advanceCents)}` : `Bruto ${money(shown.grossCents)} · IRRF ${money(shown.irrfCents)}`}
            </span>
          )}
        </div>
      </div>
      <div ref={chartRef}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ height }} className="mt-2 block w-full touch-pan-y" role="img" aria-label={`Líquido por mês em ${year}`} {...handlers}>
        <defs>
          <pattern id="payroll-incomplete" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--warning-subtle)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--warning)" strokeWidth="2" />
          </pattern>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeDasharray="3 4" />
            {showValues && (
              <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fontSize={fontSize} fill="var(--text-muted)" fontFamily="var(--font-numeric), monospace">
                {compact.format(tick / 100)}
              </text>
            )}
          </g>
        ))}
        {series.map((point, index) => {
          if (point.status === 'EMPTY') return null;
          const barWidth = Math.min(slot * 0.62, 44);
          const dim = activeIndex !== null && activeIndex !== index;
          return (
            <motion.rect
              key={point.month}
              x={x(index) - barWidth / 2}
              // As barras sobem do chão, uma depois da outra, com uma mola que passa e volta.
              initial={reduce ? false : { y: height - pad.bottom, height: 0 }}
              whileInView={{ y: y(point.barCents), height: Math.max(2, height - pad.bottom - y(point.barCents)) }}
              viewport={{ once: true }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 130, damping: 13, delay: index * 0.05 }}
              width={barWidth}
              rx="5"
              fill={point.status === 'COMPLETE' ? 'var(--primary)' : 'url(#payroll-incomplete)'}
              stroke={point.status === 'COMPLETE' ? undefined : 'var(--warning)'}
              strokeDasharray={point.status === 'COMPLETE' ? undefined : '3 3'}
              opacity={dim ? 0.45 : 1}
            />
          );
        })}
        {series.map((point, index) => (
          <text
            key={`label-${point.month}`}
            x={x(index)}
            y={height - 8}
            textAnchor="middle"
            fontSize={fontSize}
            fill={index === shownIndex ? 'var(--foreground)' : 'var(--text-muted)'}
            fontWeight={index === shownIndex ? 700 : 400}
          >
            {monthNames[point.month - 1]}
          </text>
        ))}
      </svg>
      </div>
    </div>
  );
}
