'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { RiseArticle } from '@/app/components/ui/motion';

import { Button } from '@/app/components/ui';
import { useMediaQuery } from '@/app/hooks/use-media-query';
import { typeLabel, quantityLabel, quoteDateLabel } from '@/app/components/pages/investment/investments-helpers';
import { isOldQuote, type RankedPosition } from '@/app/components/pages/investment/investments-model';
import { formatCurrency } from '@/app/lib/currency/format-currency';

const percent = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const COLUMNS_WIDE = 'grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_4rem]';
const COLUMNS_NARROW = 'grid-cols-[minmax(0,1fr)_auto]';

export function PositionsList({
  ranked,
  showValues,
  onHistory,
}: {
  ranked: RankedPosition[];
  showValues: boolean;
  onHistory: (assetId: string) => void;
}) {
  const reduce = useReducedMotion();
  const isWide = useMediaQuery('(min-width: 768px)');
  const columns = isWide ? COLUMNS_WIDE : COLUMNS_NARROW;

  return (
    <RiseArticle className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]">
      <div className="px-4 pb-2 pt-4 sm:px-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Posições</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Ordenadas pelo valor. Toque no código para ver o histórico do ativo.</p>
      </div>

      {ranked.length === 0 ? (
        <p className="px-4 pb-5 text-sm text-[var(--text-muted)] sm:px-5">Nenhuma posição aberta nesta moeda.</p>
      ) : (
        <>
          {isWide && (
            <div className={`grid gap-3 border-t border-[var(--border)] bg-[var(--surface-raised)] px-5 py-2 text-xs font-semibold text-[var(--text-muted)] ${columns}`} aria-hidden="true">
              <span>Ativo</span>
              <span className="text-right">Quantidade × preço médio</span>
              <span className="text-right">Valor</span>
              <span className="text-right">Resultado</span>
              <span className="text-right">Carteira</span>
            </div>
          )}
          <ul>
            {ranked.map(({ position, value, priced, gain, gainPercent, sharePercent }, index) => {
              const money = (cents: number) => (showValues ? formatCurrency(cents, position.currency) : '••••');
              const up = (gain ?? 0) >= 0;
              const old = priced && position.quote ? isOldQuote(position.quote.referenceAt) : false;
              const result =
                gain === null ? (
                  <span className="text-xs text-[var(--text-muted)]">sem resultado</span>
                ) : (
                  <span className={`money font-semibold ${isWide ? 'text-sm' : 'text-xs'} ${up ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                    {showValues ? `${up ? '+' : '−'}${formatCurrency(Math.abs(gain), position.currency)}${gainPercent !== null ? ` · ${percent(Math.abs(gainPercent))}` : ''}` : '••••'}
                  </span>
                );
              return (
                <motion.li
                  key={`${position.accountId}-${position.assetId}`}
                  // As posições "sobem" ao entrar, uma depois da outra; no toque a linha encolhe de leve.
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22, delay: Math.min(index, 8) * 0.06 }}
                  whileTap={{ scale: 0.985 }}
                  className="border-t border-[var(--border)]"
                >
                  <div className={`grid items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5 ${columns}`}>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <Button
                          variant="link"
                          size="xs"
                          onClick={() => onHistory(position.assetId)}
                          aria-label={`Ver histórico de ${position.symbol}`}
                          className="-ml-3 text-base"
                        >
                          {position.symbol}
                        </Button>
                        {!priced && (
                          <span className="rounded-md bg-[var(--surface-subtle)] px-1.5 py-0.5 text-xs font-bold text-[var(--text-muted)]">A custo</span>
                        )}
                        {old && position.quote && (
                          <span className="rounded-md bg-[var(--warning-subtle)] px-1.5 py-0.5 text-xs font-bold text-[var(--warning)]">
                            Cotação de {quoteDateLabel(position.quote.referenceAt)}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-[var(--text-muted)]">
                        {typeLabel(position.assetType)} · {position.accountName}
                      </span>
                    </span>
                    {isWide && (
                      <span className="text-right text-sm">
                        <span className="text-[var(--text-muted)]">{quantityLabel(position.quantity)} × </span>
                        <span className="money font-semibold">{money(position.averageUnitCostCents)}</span>
                      </span>
                    )}
                    <span className={isWide ? 'text-right' : 'grid text-right'}>
                      <strong className="money font-semibold">{money(value)}</strong>
                      {!isWide && <span className="text-xs text-[var(--text-muted)]">{quantityLabel(position.quantity)} un.</span>}
                    </span>
                    <span className={isWide ? 'text-right' : 'col-span-2 text-left'}>{result}</span>
                    {isWide && <span className="text-right text-sm font-semibold">{percent(sharePercent)}</span>}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </>
      )}
    </RiseArticle>
  );
}
