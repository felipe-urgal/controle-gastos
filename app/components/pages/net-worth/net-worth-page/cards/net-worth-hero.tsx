'use client';

import Link from 'next/link';
import { FaChevronDown } from 'react-icons/fa';

import { displayMoney, displayPercent, logicalDateLabel, quoteDateTimeLabel, valuationBasisLabel } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';
import { liabilityShare, summarizeQuality, type NetWorthVariation } from '@/app/components/pages/net-worth/net-worth-page/net-worth-model';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { NetWorthValuationQuality } from '@/app/types/net-worth';

export function NetWorthHero({
  total,
  assetsTotal,
  liabilitiesTotal,
  currency,
  showValues,
  accountCount,
  debtCount,
  valuation,
  variation,
  months,
}: {
  total: number;
  assetsTotal: number;
  liabilitiesTotal: number;
  currency: SupportedCurrency;
  showValues: boolean;
  accountCount: number;
  debtCount: number;
  valuation: NetWorthValuationQuality;
  variation: NetWorthVariation | null;
  months: number;
}) {
  const share = liabilityShare(assetsTotal, liabilitiesTotal);
  const debtWidth = share ?? 0;
  const quality = summarizeQuality(valuation);
  const quoteRange =
    valuation.oldestQuoteReferenceAt && valuation.latestQuoteReferenceAt
      ? valuation.oldestQuoteReferenceAt === valuation.latestQuoteReferenceAt
        ? quoteDateTimeLabel(valuation.latestQuoteReferenceAt)
        : `${quoteDateTimeLabel(valuation.oldestQuoteReferenceAt)} → ${quoteDateTimeLabel(valuation.latestQuoteReferenceAt)}`
      : null;
  const up = variation ? variation.amount >= 0 : true;

  return (
    <section aria-labelledby="net-worth-hero-label" className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6">
      <div>
        <p id="net-worth-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">
          Patrimônio líquido em {currency}
        </p>
        <strong className="money mt-2 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
          {displayMoney(total, showValues, currency)}
        </strong>
        {variation && (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {variation.percent !== null && (
              <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${up ? 'bg-[var(--surface-raised)] text-[var(--income)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`}>
                {up ? '▲' : '▼'} {displayPercent(Math.abs(variation.percent), showValues).replace('+', '')}
              </span>
            )}
            <span className="money font-semibold">
              {showValues ? `${up ? '+' : '−'}${formatCurrency(Math.abs(variation.amount), currency)}` : '••••'}
            </span>
            <span className="text-[var(--text-muted)]">em {months} {months === 1 ? 'mês' : 'meses'}</span>
          </p>
        )}
      </div>

      <div className="grid gap-3">
        <div
          className="flex h-3.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
          role="img"
          aria-label={share === null ? 'Sem ativos positivos para comparar com as dívidas' : `Dívidas equivalem a ${share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos ativos`}
        >
          {share !== null && (
            <>
              <span className="h-full bg-[var(--primary)]" style={{ width: `${100 - debtWidth}%` }} />
              <span className="h-full bg-[var(--expense)] opacity-85" style={{ width: `${debtWidth}%` }} />
            </>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat dot="var(--primary)" label="Ativos" value={displayMoney(assetsTotal, showValues, currency)} detail={`${accountCount} ${accountCount === 1 ? 'conta elegível' : 'contas elegíveis'}`} />
          <Stat dot="var(--expense)" label="Passivos" value={displayMoney(liabilitiesTotal, showValues, currency)} detail={`${debtCount} ${debtCount === 1 ? 'dívida com saldo' : 'dívidas com saldo'}`} />
          <Stat
            label="Dívidas pesam"
            value={share === null ? '—' : `${share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
            detail="dos ativos"
          />
        </div>
      </div>

      <details className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)]">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
          <span className={`h-2.5 w-2.5 rounded-full ${quality.tone === 'warning' ? 'bg-[var(--warning)]' : 'bg-[var(--income)]'}`} aria-hidden="true" />
          <strong>{quality.headline}</strong>
          <span className="text-[var(--text-muted)]">
            {valuationBasisLabel(valuation.basis)} · {logicalDateLabel(valuation.asOf)}
          </span>
          <FaChevronDown className="ml-auto text-xs text-[var(--text-muted)] transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-2 px-4 pb-4 text-sm leading-relaxed text-[var(--text-muted)]">
          <p>
            {valuation.positionCount > 0
              ? `${valuation.marketPositionCount} de ${valuation.positionCount} posições usam cotação de mercado.`
              : 'Base integralmente transacional.'}
          </p>
          {valuation.positionCount > 0 && (
            <>
              <p>
                Cobertura de mercado: <strong className="text-[var(--foreground)]">{valuation.quoteCoveragePercentage.toLocaleString('pt-BR')}%</strong>.
                {valuation.costPositionCount > 0
                  ? ` ${valuation.costPositionCount} ${valuation.costPositionCount === 1 ? 'posição usa' : 'posições usam'} custo por falta de cotação elegível.`
                  : ''}
              </p>
              {quoteRange && <p>Referência das cotações: {quoteRange} UTC.</p>}
            </>
          )}
          {valuation.compositionStatus === 'UNRECONCILED_TRANSACTION_BALANCE' && (
            <p className="rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3 py-2 text-[var(--foreground)]">
              Composição não conciliada: existe saldo transacional junto com posições. O total usa as posições e preserva{' '}
              {showValues ? formatCurrency(valuation.unreconciledTransactionBalance, currency) : '••••'} como referência transacional, sem somá-lo automaticamente.
            </p>
          )}
          {valuation.staleMarketPositionCount > 0 && (
            <p className="rounded-[var(--radius-md)] bg-[var(--warning-subtle)] px-3 py-2 text-[var(--foreground)]">
              {valuation.staleMarketPositionCount}{' '}
              {valuation.staleMarketPositionCount === 1 ? 'posição usa cotação com mais de 7 dias.' : 'posições usam cotações com mais de 7 dias.'}{' '}
              <Link href="/investimentos" className="font-semibold text-[var(--primary)] underline underline-offset-2">
                Revisar investimentos
              </Link>
            </p>
          )}
        </div>
      </details>
    </section>
  );
}

function Stat({ label, value, detail, dot }: { label: string; value: string; detail: string; dot?: string }) {
  return (
    <div className="grid gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-4 py-3.5">
      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
        {dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} aria-hidden="true" />}
        {label}
      </span>
      <span className="money break-words text-xl font-semibold">{value}</span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </div>
  );
}
