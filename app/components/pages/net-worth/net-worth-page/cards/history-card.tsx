'use client';

import { useState } from 'react';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { NetWorthData, NetWorthValuationQuality } from '@/app/types/net-worth';
import { displayMoney, logicalDateLabel, monthShort, valuationBasisLabel } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';

export function HistoryCard({
  history,
  currency,
  showValues,
  valuation,
  historyValuation,
}: {
  history: Array<{ year: number; month: number; value: number }>;
  currency: SupportedCurrency;
  showValues: boolean;
  valuation: NetWorthValuationQuality;
  historyValuation: NetWorthData['historyValuation'];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const values = history.map((item) => item.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = Math.max(1, max - min);
  const width = 720;
  const height = 250;
  const paddingX = 28;
  const paddingY = 28;

  const points = history.map((item, index) => {
    const x =
      history.length <= 1
        ? width / 2
        : paddingX +
          (index / (history.length - 1)) * (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((item.value - min) / range) * (height - paddingY * 2);
    return { ...item, x, y };
  });

  const path =
    points.length === 0
      ? ''
      : points
          .map((point, index) =>
            `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
          )
          .join(' ');

  const first = history[0]?.value ?? 0;
  const last = history.at(-1)?.value ?? 0;
  const variation = last - first;
  const selectedPoint = points[activeIndex ?? points.length - 1] ?? null;
  const firstPoint = points[0] ?? null;
  const lastPoint = points.at(-1) ?? null;
  const chartSummary =
    firstPoint && lastPoint
      ? `De ${monthShort(firstPoint.year, firstPoint.month)} (${displayMoney(firstPoint.value, showValues, currency)}) a ${monthShort(lastPoint.year, lastPoint.month)} (${displayMoney(lastPoint.value, showValues, currency)}).`
      : 'Sem histórico no período.';

  function selectFromPointer(event: React.PointerEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    for (let index = 1; index < points.length; index += 1) {
      if (Math.abs(points[index].x - x) < Math.abs(points[nearest].x - x)) nearest = index;
    }
    setActiveIndex(nearest);
  }

  return (
    <article className="min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Evolução contábil mensal
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Fechamento de cada mês com {valuationBasisLabel(historyValuation.basis)}:
            transações concluídas menos passivos registrados pela data efetiva.
          </p>
        </div>
        <div className="text-right">
          <span className="block text-xs text-[var(--text-muted)]">
            Variação no período
          </span>
          <strong
            className={
              variation < 0
                ? 'text-[var(--expense)]'
                : variation > 0
                  ? 'text-[var(--income)]'
                  : 'text-[var(--foreground)]'
            }
          >
            {showValues
              ? `${variation > 0 ? '+' : ''}${formatCurrency(variation, currency)}`
              : '••••'}
          </strong>
        </div>
      </div>

      {!valuation.comparableToHistory && (
        <div className="mt-4 rounded-[12px] border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
          O snapshot acima usa {valuationBasisLabel(valuation.basis)}, enquanto esta
          série usa saldo transacional. O último ponto do gráfico não representa o
          mesmo método de valuation do hero e pode ter valor diferente.
        </div>
      )}

      <div className="mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full touch-pan-y"
          role="img"
          aria-label={`Evolução contábil mensal do patrimônio em ${currency}. ${chartSummary}`}
          onPointerDown={selectFromPointer}
          onPointerMove={(event) => {
            if (event.pointerType === 'mouse') selectFromPointer(event);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setActiveIndex(null);
          }}
        >
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="currentColor"
            className="text-[var(--border)]"
          />
          {path && (
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--orbit-primary)]"
            />
          )}
          {points.map((point, index) => (
            <g key={`${point.year}-${point.month}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={selectedPoint === point ? 11 : 7}
                fill="currentColor"
                className="text-[var(--orbit-primary)]"
                opacity={selectedPoint === point || index === 0 || index === points.length - 1 ? 1 : 0.55}
              />
              <title>
                {monthShort(point.year, point.month)}:{' '}
                <span className="money">{displayMoney(point.value, showValues, currency)}</span>
              </title>
            </g>
          ))}
        </svg>
      </div>

      <p
        className="mt-2 rounded-[10px] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--foreground)]"
        aria-live="polite"
      >
        {selectedPoint ? (
          <>
            <span className="text-[var(--text-muted)]">
              {monthShort(selectedPoint.year, selectedPoint.month)}
              {activeIndex === null ? ' (último mês)' : ''}:
            </span>{' '}
            <strong><span className="money">{displayMoney(selectedPoint.value, showValues, currency)}</span></strong>
          </>
        ) : (
          'Sem histórico no período.'
        )}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[var(--text-muted)]">
        <span>
          {history[0] ? monthShort(history[0].year, history[0].month) : '—'}
        </span>
        <span className="text-center">
          {history[Math.floor(history.length / 2)]
            ? monthShort(
                history[Math.floor(history.length / 2)].year,
                history[Math.floor(history.length / 2)].month,
              )
            : '—'}
        </span>
        <span className="text-right">
          {history.at(-1)
            ? monthShort(history.at(-1)!.year, history.at(-1)!.month)
            : '—'}
        </span>
      </div>

      <details className="mt-4 rounded-[12px] border border-[var(--border)]">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-[var(--foreground)]">
          Ver valores em tabela
        </summary>
        <div className="overflow-x-auto border-t border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-raised)] text-xs text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 font-semibold">Mês</th>
                <th className="px-3 py-2 text-right font-semibold">
                  Patrimônio {currency}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {history.map((item) => (
                <tr key={`table-${item.year}-${item.month}`}>
                  <td className="px-3 py-2 text-[var(--foreground)]">
                    {monthShort(item.year, item.month)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-[var(--foreground)]">
                    <span className="money">{displayMoney(item.value, showValues, currency)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
        {historyValuation.description} O ponto mais recente usa dados até{' '}
        {logicalDateLabel(historyValuation.currentPointAsOf)}.
      </p>
    </article>
  );
}
