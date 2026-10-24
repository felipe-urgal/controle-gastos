'use client';

import { useState } from 'react';

import { Chip, ChipRow, MoneyText } from '@/app/components/ui';
import { quoteDateLabel, typeLabel } from '@/app/components/pages/investment/investments-helpers';
import type { CurrencyPortfolioSummary } from '@/app/components/pages/investment/investments-model';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { InvestmentAssetType } from '@/app/types/investment';

// Cores do tema, distintas entre si e legíveis nos dois temas.
const typeColors: Record<InvestmentAssetType, string> = {
  STOCK: 'var(--orbit-primary)',
  FII: 'var(--info)',
  ETF: 'var(--pending)',
  FIXED_INCOME: 'var(--income)',
  CRYPTO: 'var(--warning)',
  FUND: 'var(--text-muted)',
  OTHER: 'var(--border-strong)',
};

const percent = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function PortfolioSummary({
  summary,
  incomeTotal,
  currencies,
  onCurrency,
  showValues,
}: {
  summary: CurrencyPortfolioSummary;
  incomeTotal: number;
  currencies: SupportedCurrency[];
  onCurrency: (currency: SupportedCurrency) => void;
  showValues: boolean;
}) {
  const [activeType, setActiveType] = useState<InvestmentAssetType | null>(null);
  const money = (cents: number) => (showValues ? formatCurrency(cents, summary.currency) : '••••');
  const up = summary.gain >= 0;
  const active = summary.allocation.find((slice) => slice.type === activeType) ?? null;

  return (
    <section aria-labelledby="portfolio-hero-label" className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="portfolio-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">
            Valor da carteira em {summary.currency}
          </p>
          <strong className="money mt-2 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
            {money(summary.marketValue)}
          </strong>
          {summary.pricedCount > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {summary.gainPercent !== null && (
                <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${up ? 'bg-[var(--surface-raised)] text-[var(--income)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`}>
                  {up ? '▲' : '▼'} {showValues ? percent(Math.abs(summary.gainPercent)) : '••••'}
                </span>
              )}
              <span className="money font-semibold">{showValues ? `${up ? '+' : '−'}${formatCurrency(Math.abs(summary.gain), summary.currency)}` : '••••'}</span>
              <span className="text-[var(--text-muted)]">sobre o custo das posições com cotação</span>
            </p>
          )}
        </div>
        {currencies.length > 1 && (
          <div className="flex gap-2" role="group" aria-label="Moeda da carteira">
            {currencies.map((code) => (
              <Chip key={code} selected={code === summary.currency} onClick={() => onCurrency(code)}>
                {code}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Custo investido" value={money(summary.costBasis)} detail={`${summary.positionCount} ${summary.positionCount === 1 ? 'posição aberta' : 'posições abertas'}`} />
        <Stat label="Proventos recebidos" value={money(incomeTotal)} detail="sem alterar o saldo das contas" />
        <Stat label="Cobertura de mercado" value={`${summary.pricedCount} de ${summary.positionCount}`} detail={[summary.unpricedCount === 0 ? 'todas com cotação' : `${summary.unpricedCount} sem cotação`, summary.latestQuoteAt ? `última em ${quoteDateLabel(summary.latestQuoteAt)}` : null].filter(Boolean).join(' · ')} />
      </div>

      {(summary.unpricedCount > 0 || summary.staleCount > 0) && (
        <div className="grid gap-1 rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-4 py-3 text-sm text-[var(--foreground)]">
          {summary.unpricedCount > 0 && (
            <p>
              {summary.unpricedCount} {summary.unpricedCount === 1 ? 'posição sem cotação não entra' : 'posições sem cotação não entram'} no valor de mercado nem no resultado. {summary.unpricedCount === 1 ? 'Ela aparece' : 'Elas aparecem'} a custo na lista.
            </p>
          )}
          {summary.staleCount > 0 && (
            <p>
              {summary.staleCount} {summary.staleCount === 1 ? 'cotação tem' : 'cotações têm'} mais de 7 dias. Atualize as cotações para refletir o mercado.
            </p>
          )}
        </div>
      )}

      {summary.allocation.length > 0 && (
        <div className="grid gap-3">
          <h2 className="text-sm font-bold">Como a carteira está dividida</h2>
          <div className="flex h-4 gap-0.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="img" aria-label={`Alocação por tipo: ${summary.allocation.map((slice) => `${typeLabel(slice.type)} ${percent(slice.share)}`).join(', ')}`}>
            {summary.allocation.map((slice) => (
              <span
                key={slice.type}
                className={`h-full min-w-1 transition-opacity ${activeType && activeType !== slice.type ? 'opacity-35' : ''}`}
                style={{ width: `${slice.share}%`, background: typeColors[slice.type] }}
              />
            ))}
          </div>
          <ChipRow label="Tipos de ativo">
            {summary.allocation.map((slice) => (
              <Chip
                key={slice.type}
                selected={activeType === slice.type}
                onClick={() => setActiveType(activeType === slice.type ? null : slice.type)}
                className="font-semibold"
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: typeColors[slice.type] }} aria-hidden="true" />
                {typeLabel(slice.type)} · {percent(slice.share)}
              </Chip>
            ))}
          </ChipRow>
          <p className="min-h-10 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-2 text-sm" aria-live="polite">
            {active ? (
              <>
                <strong>{typeLabel(active.type)}</strong> · <MoneyText>{money(active.value)}</MoneyText> · {percent(active.share)} da carteira
              </>
            ) : (
              <span className="text-[var(--text-muted)]">Escolha um tipo para ver o detalhe.</span>
            )}
          </p>
        </div>
      )}

    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="grid gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-4 py-3.5">
      <span className="text-sm font-semibold text-[var(--text-muted)]">{label}</span>
      <span className="money break-words text-xl font-semibold">{value}</span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </div>
  );
}
