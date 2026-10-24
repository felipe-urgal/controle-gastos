'use client';

import { ChartCursor } from '@/app/components/charts/chart-cursor';
import { useChartWidth } from '@/app/components/charts/use-chart-width';
import { useChartScrub } from '@/app/components/charts/use-chart-scrub';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { BalanceSeries } from '@/app/components/pages/dashboard/forecast/forecast-series';
import type { ForecastLogicalDate } from '@/app/types/forecast';


function dayNumber(date: ForecastLogicalDate) {
  return Date.UTC(date.year, date.month - 1, date.day) / 86_400_000;
}

function shortDate(date: ForecastLogicalDate) {
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}`;
}

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** Eixo em unidades da moeda (os valores chegam em centavos). */
function axisLabel(cents: number) {
  return compact.format(cents / 100);
}

/** Valores "redondos" para o eixo vertical, incluindo o zero quando a curva cruza. */
function niceTicks(min: number, max: number) {
  const span = Math.max(max - min, 1);
  const rough = span / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough) ?? magnitude * 10;
  const first = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let value = first; value <= max + step * 0.01; value += step) ticks.push(Math.round(value));
  return ticks;
}

export function ForecastBalanceChart({
  series,
  currency,
  showValues,
}: {
  series: BalanceSeries;
  currency: string;
  showValues: boolean;
}) {
  const { ref: chartRef, width: WIDTH } = useChartWidth(640);
  const narrow = WIDTH < 520;
  const HEIGHT = narrow ? 210 : 230;
  const PAD = { left: narrow ? 44 : 52, right: 14, top: 18, bottom: 26 };
  const startDay = dayNumber(series.asOf);
  const endDay = Math.max(dayNumber(series.horizonEnd), startDay + 1);
  const balances = [series.startBalance, ...series.points.map((point) => point.balance)];
  const dataMin = Math.min(...balances);
  const dataMax = Math.max(...balances);
  const padding = Math.max((dataMax - dataMin) * 0.12, Math.abs(dataMax) * 0.02, 1_000);
  const yMin = Math.min(dataMin - padding, 0);
  const yMax = dataMax + padding;
  const ticks = niceTicks(yMin, yMax);
  const axisMin = Math.min(yMin, ticks[0]);
  const axisMax = Math.max(yMax, ticks[ticks.length - 1]);

  const x = (date: ForecastLogicalDate | number) =>
    PAD.left + (((typeof date === 'number' ? date : dayNumber(date)) - startDay) / (endDay - startDay)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - (value - axisMin) / (axisMax - axisMin)) * (HEIGHT - PAD.top - PAD.bottom);

  // Curva em degraus: o saldo só muda nos dias com lançamento.
  let path = `M ${x(startDay)} ${y(series.startBalance)}`;
  let previous = series.startBalance;
  for (const point of series.points) {
    path += ` L ${x(point.date)} ${y(previous)} L ${x(point.date)} ${y(point.balance)}`;
    previous = point.balance;
  }
  path += ` L ${x(endDay)} ${y(previous)}`;
  const zeroY = y(0);
  const area = `${path} L ${x(endDay)} ${zeroY} L ${x(startDay)} ${zeroY} Z`;

  const hasNegative = dataMin < 0;
  const lowestIsRelevant = series.lowest.balance < series.startBalance;
  const labelValue = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => startDay + (endDay - startDay) * fraction);
  const dateFromDay = (day: number): ForecastLogicalDate => {
    const instant = new Date(day * 86_400_000);
    return { year: instant.getUTCFullYear(), month: instant.getUTCMonth() + 1, day: instant.getUTCDate() };
  };
  // Um ponto por dia do horizonte: o saldo vale o do último lançamento até aquele dia.
  const dayCount = Math.round(endDay - startDay) + 1;
  const days = Array.from({ length: dayCount }, (_, offset) => {
    const day = startDay + offset;
    let balance = series.startBalance;
    for (const point of series.points) {
      if (dayNumber(point.date) <= day) balance = point.balance;
    }
    return { day, balance, x: x(day), y: y(balance) };
  });
  const { activeIndex, handlers } = useChartScrub(days.map((item) => item.x), WIDTH);
  const shown = activeIndex === null ? null : days[activeIndex];
  const lowestX = x(series.lowest.date);
  const lowestAnchor = lowestX > WIDTH - 130 ? 'end' : 'start';

  return (
    <div ref={chartRef}>
    <p className="mb-1 min-h-6 text-sm text-[var(--text-muted)]" aria-live="polite">
      {shown ? (
        <>
          {shortDate(dateFromDay(shown.day))}: <strong className="money text-[var(--foreground)]">{labelValue(shown.balance)}</strong>
        </>
      ) : (
        'Passe o cursor ou toque no gráfico para ver o saldo de cada dia.'
      )}
    </p>
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ height: HEIGHT }}
      className="block w-full touch-pan-y"
      {...handlers}
      role="img"
      aria-label={`Saldo projetado de ${shortDate(series.asOf)} a ${shortDate(series.horizonEnd)}. Começa em ${labelValue(series.startBalance)}, termina em ${labelValue(series.endBalance)}, com menor saldo de ${labelValue(series.lowest.balance)} em ${shortDate(series.lowest.date)}.`}
    >
      <defs>
        <clipPath id="forecast-above-zero">
          <rect x="0" y="0" width={WIDTH} height={zeroY} />
        </clipPath>
        <clipPath id="forecast-below-zero">
          <rect x="0" y={zeroY} width={WIDTH} height={HEIGHT - zeroY} />
        </clipPath>
      </defs>

      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={tick === 0 ? 1.4 : 1} strokeOpacity={tick === 0 ? 1 : 0.7} />
          {showValues && (
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-numeric), monospace">
              {axisLabel(tick)}
            </text>
          )}
        </g>
      ))}
      {xTicks.map((day, index) => (
        <text key={day} x={x(day)} y={HEIGHT - 6} textAnchor={index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--text-muted)">
          {shortDate(dateFromDay(day))}
        </text>
      ))}

      <path d={area} fill="var(--primary)" fillOpacity="0.12" clipPath="url(#forecast-above-zero)" />
      {hasNegative && <path d={area} fill="var(--expense)" fillOpacity="0.16" clipPath="url(#forecast-below-zero)" />}
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinejoin="round" clipPath="url(#forecast-above-zero)" />
      {hasNegative && <path d={path} fill="none" stroke="var(--expense)" strokeWidth="2.2" strokeLinejoin="round" clipPath="url(#forecast-below-zero)" />}

      <circle cx={x(startDay)} cy={y(series.startBalance)} r="4" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />
      {lowestIsRelevant && (
        <g>
          <circle cx={lowestX} cy={y(series.lowest.balance)} r="5" fill={series.lowest.balance < 0 ? 'var(--expense)' : 'var(--warning)'} stroke="var(--surface)" strokeWidth="2" />
          <text
            x={lowestX + (lowestAnchor === 'end' ? -9 : 9)}
            y={y(series.lowest.balance) + (series.lowest.balance < series.startBalance ? 16 : -8)}
            textAnchor={lowestAnchor}
            fontSize="11.5"
            fontWeight="600"
            fill="var(--foreground)"
            fontFamily="var(--font-numeric), monospace"
          >
            {`Menor saldo ${labelValue(series.lowest.balance)}`}
          </text>
        </g>
      )}
      {shown && <ChartCursor x={shown.x} y={shown.y} top={PAD.top} bottom={HEIGHT - PAD.bottom} color={shown.balance < 0 ? 'var(--expense)' : 'var(--primary)'} />}
    </svg>
    </div>
  );
}
