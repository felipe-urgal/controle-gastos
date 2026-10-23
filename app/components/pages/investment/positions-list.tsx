'use client';

import { Button } from '@/app/components/ui';
import { typeLabel, quantityLabel, quoteDateLabel } from '@/app/components/pages/investment/investments-helpers';
import type { RankedPosition } from '@/app/components/pages/investment/investments-model';
import { formatCurrency } from '@/app/lib/currency/format-currency';

const percent = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function PositionsList({
  ranked,
  showValues,
  onHistory,
}: {
  ranked: RankedPosition[];
  showValues: boolean;
  onHistory: (assetId: string) => void;
}) {
  return (
    <article className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <h2 className="text-lg font-bold text-[var(--foreground)]">Posições</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Ordenadas pelo valor. Toque no símbolo para ver o histórico do ativo.</p>

      {ranked.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhuma posição aberta nesta moeda.</p>
      ) : (
        <ul className="mt-2">
          {ranked.map(({ position, value, priced, gain, gainPercent, weightPercent }) => {
            const money = (cents: number) => (showValues ? formatCurrency(cents, position.currency) : '••••');
            const up = (gain ?? 0) >= 0;
            return (
              <li key={`${position.accountId}-${position.assetId}`} className="border-t border-[var(--border)] first:border-t-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <span className="min-w-0">
                    <Button
                      variant="link"
                      size="xs"
                      onClick={() => onHistory(position.assetId)}
                      aria-label={`Ver histórico de ${position.symbol}`}
                      className="-ml-3 text-base"
                    >
                      {position.symbol}
                    </Button>
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {position.accountName} · {typeLabel(position.assetType)} · {quantityLabel(position.quantity)} un.
                    </span>
                  </span>
                  <span className="hidden text-right md:grid">
                    <span className="text-xs text-[var(--text-muted)]">Custo médio</span>
                    <strong className="money font-semibold">{money(position.averageUnitCostCents)}</strong>
                  </span>
                  <span className="grid text-right">
                    <strong className="money font-semibold">{money(value)}</strong>
                    {gain !== null ? (
                      <span className={`money text-xs font-semibold ${up ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                        {showValues ? `${up ? '+' : '−'}${formatCurrency(Math.abs(gain), position.currency)}${gainPercent !== null ? ` · ${percent(Math.abs(gainPercent))}` : ''}` : '••••'}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">sem resultado</span>
                    )}
                  </span>
                  <span className="col-span-full h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`Peso relativo ${Math.round(weightPercent)}% da maior posição`}>
                    <span className="block h-full rounded-full bg-[var(--orbit-primary)]" style={{ width: `${weightPercent}%` }} />
                  </span>
                  {(!priced || position.quote?.isStale) && (
                    <span className="col-span-full flex flex-wrap gap-2 text-xs font-bold tracking-[0.02em]">
                      {!priced ? (
                        <span className="rounded-md bg-[var(--surface-subtle)] px-2 py-0.5 text-[var(--text-muted)]">SEM COTAÇÃO · A CUSTO</span>
                      ) : (
                        <span className="rounded-md bg-[var(--warning-subtle)] px-2 py-0.5 text-[var(--warning)]">
                          COTAÇÃO ANTIGA · {position.quote ? quoteDateLabel(position.quote.referenceAt) : ''}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
