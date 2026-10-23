'use client';

import { ChartCursor } from '@/app/components/charts/chart-cursor';
import { useChartWidth } from '@/app/components/charts/use-chart-width';
import { useChartScrub } from '@/app/components/charts/use-chart-scrub';
import { displayMoney, logicalDateLabel, monthShort, valuationBasisLabel } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';
import { summarizeVariation } from '@/app/components/pages/net-worth/net-worth-page/net-worth-model';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { NetWorthData, NetWorthValuationQuality } from '@/app/types/net-worth';

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

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
  // O gráfico desenha na largura real do contêiner: altura fixa e rótulos no tamanho do texto.
  const { ref: chartRef, width: WIDTH } = useChartWidth(760);
  const narrow = WIDTH < 520;
  const HEIGHT = narrow ? 220 : 240;
  const PAD = { left: narrow ? 46 : 60, right: 14, top: 16, bottom: 28 };
  const values = history.map((item) => item.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(1, max - min);
  const low = min - span * 0.08;
  const high = max + span * 0.08;
  const x = (index: number) =>
    history.length <= 1 ? WIDTH / 2 : PAD.left + (index / (history.length - 1)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - (value - low) / (high - low)) * (HEIGHT - PAD.top - PAD.bottom);
  const points = history.map((item, index) => ({ ...item, x: x(index), y: y(item.value) }));
  const { activeIndex, handlers } = useChartScrub(points.map((point) => point.x), WIDTH);

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const baseline = HEIGHT - PAD.bottom;
  const area = points.length > 1 ? `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z` : '';
  const ticks = [0, 1, 2, 3].map((step) => low + ((high - low) * step) / 3);
  const labelStep = history.length > (narrow ? 6 : 12) ? Math.ceil(history.length / (narrow ? 6 : 12)) : 1;

  const variation = summarizeVariation(values);
  const shown = points[activeIndex ?? points.length - 1] ?? null;
  const first = points[0];
  const last = points[points.length - 1];
  const summary =
    first && last
      ? `De ${monthShort(first.year, first.month)} (${displayMoney(first.value, showValues, currency)}) a ${monthShort(last.year, last.month)} (${displayMoney(last.value, showValues, currency)}).`
      : 'Sem histórico no período.';

  return (
    <article className="min-w-0 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[56ch]">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Evolução mês a mês</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Fechamento de cada mês com {valuationBasisLabel(historyValuation.basis)}: transações concluídas menos passivos registrados pela data efetiva.
          </p>
        </div>
        <div className="text-right" aria-live="polite">
          <span className="block text-xs font-semibold text-[var(--text-muted)]">
            {shown ? `${monthShort(shown.year, shown.month)}${activeIndex === null ? ' (último mês)' : ''}` : '—'}
          </span>
          <strong className="money block text-xl font-semibold">{shown ? displayMoney(shown.value, showValues, currency) : '—'}</strong>
          {variation && (
            <span className={`money text-xs font-semibold ${variation.amount < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}`}>
              {showValues ? `${variation.amount > 0 ? '+' : ''}${formatCurrency(variation.amount, currency)} no período` : '••••'}
            </span>
          )}
        </div>
      </div>

      {!valuation.comparableToHistory && (
        <div className="mt-4 rounded-[12px] bg-[var(--warning-subtle)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
          O resumo acima usa {valuationBasisLabel(valuation.basis)}, enquanto esta série usa saldo transacional. O último ponto do gráfico não representa o mesmo método e pode ter valor diferente.
        </div>
      )}

      <div ref={chartRef} className="mt-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ height: HEIGHT }}
        className="block w-full touch-pan-y"
        role="img"
        aria-label={`Evolução mensal do patrimônio em ${currency}. ${summary}`}
        {...handlers}
      >
        <defs>
          <linearGradient id="net-worth-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--orbit-primary)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--orbit-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeDasharray="3 4" />
            {showValues && (
              <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-numeric), monospace">
                {compact.format(tick / 100)}
              </text>
            )}
          </g>
        ))}
        {area && <path d={area} fill="url(#net-worth-area)" />}
        {line && <path d={line} fill="none" stroke="var(--orbit-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((point, index) =>
          index % labelStep === 0 || index === points.length - 1 ? (
            <text key={`${point.year}-${point.month}`} x={point.x} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
              {monthShort(point.year, point.month)}
            </text>
          ) : null,
        )}
        {shown && <ChartCursor x={shown.x} y={shown.y} top={PAD.top} bottom={baseline} />}
      </svg>
      </div>

      <details className="mt-3 rounded-[12px] border border-[var(--border)]">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-[var(--foreground)]">Ver valores em tabela</summary>
        <div className="overflow-x-auto border-t border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-raised)] text-xs text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 font-semibold">Mês</th>
                <th className="px-3 py-2 text-right font-semibold">Patrimônio {currency}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {history.map((item) => (
                <tr key={`table-${item.year}-${item.month}`}>
                  <td className="px-3 py-2">{monthShort(item.year, item.month)}</td>
                  <td className="money px-3 py-2 text-right font-semibold">{displayMoney(item.value, showValues, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
        {historyValuation.description} O ponto mais recente usa dados até {logicalDateLabel(historyValuation.currentPointAsOf)}.
      </p>
    </article>
  );
}
