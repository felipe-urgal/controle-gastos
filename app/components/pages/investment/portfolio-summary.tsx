'use client';

import { Button, CurrencySelect } from '@/app/components/ui';
import { quoteDateLabel, typeLabel } from '@/app/components/pages/investment/investments-helpers';
import type { CurrencyPortfolioSummary } from '@/app/components/pages/investment/investments-model';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { InvestmentAssetType } from '@/app/types/investment';

// Cores só para distinguir os tipos: receita/despesa ficam reservadas a `--income`/`--expense`.
const typeColors: Record<InvestmentAssetType, string> = {
  STOCK: 'var(--primary)',
  FII: 'var(--info)',
  ETF: 'color-mix(in srgb, var(--info) 45%, var(--surface))',
  FIXED_INCOME: 'color-mix(in srgb, var(--primary) 45%, var(--surface))',
  CRYPTO: 'var(--warning)',
  FUND: 'var(--text-muted)',
  OTHER: 'var(--border-strong)',
};

const percent = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function PortfolioSummary({
  summary,
  incomeTotal,
  currencies,
  onCurrency,
  showValues,
  canRefreshQuotes,
  refreshingQuotes,
  onRefreshQuotes,
}: {
  summary: CurrencyPortfolioSummary;
  incomeTotal: number;
  currencies: SupportedCurrency[];
  onCurrency: (currency: SupportedCurrency) => void;
  showValues: boolean;
  canRefreshQuotes: boolean;
  refreshingQuotes: boolean;
  onRefreshQuotes: () => void;
}) {
  const money = (cents: number) => (showValues ? formatCurrency(cents, summary.currency) : '••••');
  const up = summary.gain >= 0;
  const needsAttention = summary.unpricedCount > 0 || summary.oldQuoteCount > 0;
  const attention = [
    summary.unpricedCount > 0 ? `${plural(summary.unpricedCount, 'posição sem cotação', 'posições sem cotação')} (a custo)` : null,
    summary.oldQuoteCount > 0 ? plural(summary.oldQuoteCount, 'cotação com mais de 7 dias', 'cotações com mais de 7 dias') : null,
  ].filter(Boolean).join(' · ');

  return (
    <section aria-labelledby="portfolio-hero-label" className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="portfolio-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">
            Valor estimado da carteira em {summary.currency}
          </p>
          <strong className="money mt-2 block break-words text-3xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
            {money(summary.estimatedValue)}
          </strong>
          {summary.atCostValue > 0 && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Inclui <span className="money font-semibold text-[var(--foreground)]">{money(summary.atCostValue)}</span> a custo ({plural(summary.unpricedCount, 'posição sem cotação', 'posições sem cotação')}).
            </p>
          )}
          {summary.pricedCount > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {summary.gainPercent !== null && (
                <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${up ? 'bg-[var(--surface-raised)] text-[var(--income)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`}>
                  {up ? '▲' : '▼'} {showValues ? percent(Math.abs(summary.gainPercent)) : '••••'}
                </span>
              )}
              <span className="money font-semibold">{showValues ? `${up ? '+' : '−'}${formatCurrency(Math.abs(summary.gain), summary.currency)}` : '••••'}</span>
              <span className="text-[var(--text-muted)]">nas posições com cotação</span>
            </p>
          )}
        </div>
        {currencies.length > 1 && (
          <CurrencySelect
            ariaLabel="Moeda da carteira"
            value={summary.currency}
            options={currencies}
            onChange={onCurrency}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Stat label="Custo investido" value={money(summary.costBasis)} detail={plural(summary.positionCount, 'posição aberta', 'posições abertas')} />
        <Stat label="Proventos recebidos" value={money(incomeTotal)} detail="sem alterar o saldo das contas" />
      </div>

      {needsAttention && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-4 py-3 text-sm text-[var(--foreground)]">
          <p>
            {attention}.
            {summary.latestQuoteAt ? ` Última cotação em ${quoteDateLabel(summary.latestQuoteAt)}.` : ''}
          </p>
          {canRefreshQuotes && (
            <Button variant="outline" size="sm" disabled={refreshingQuotes} onClick={onRefreshQuotes}>
              {refreshingQuotes ? 'Atualizando…' : 'Atualizar cotações'}
            </Button>
          )}
        </div>
      )}

      {summary.allocation.length > 0 && (
        <div className="grid gap-3">
          <h2 className="text-sm font-bold">Como a carteira está dividida</h2>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`Alocação por tipo: ${summary.allocation.map((slice) => `${typeLabel(slice.type)} ${percent(slice.share)}`).join(', ')}`}>
            {summary.allocation.map((slice) => (
              <span key={slice.type} className="h-full min-w-1" style={{ width: `${slice.share}%`, background: typeColors[slice.type] }} />
            ))}
          </div>
          <ul className="sm:columns-2 sm:gap-x-8">
            {summary.allocation.map((slice) => (
              <li key={slice.type} className="grid break-inside-avoid grid-cols-[auto_minmax(0,1fr)_auto_3.5rem] items-center gap-2 py-1 text-sm">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: typeColors[slice.type] }} aria-hidden="true" />
                <span className="truncate font-medium">{typeLabel(slice.type)}</span>
                <span className="money text-[var(--text-muted)]">{money(slice.value)}</span>
                <span className="text-right font-semibold">{percent(slice.share)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-4 sm:py-3.5">
      <span className="truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">{label}</span>
      <span className="money truncate text-base font-semibold sm:text-xl">{value}</span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </div>
  );
}
