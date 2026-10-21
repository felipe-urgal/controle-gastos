'use client';

import Link from 'next/link';
import { FaChartLine, FaEye } from 'react-icons/fa';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { NetWorthValuationQuality } from '@/app/types/net-worth';
import { displayMoney, logicalDateLabel, quoteDateTimeLabel, valuationBasisLabel } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';

export function NetWorthHero({
  total,
  assetsTotal,
  liabilitiesTotal,
  currency,
  showValues,
  accountCount,
  debtCount,
  valuation,
}: {
  total: number;
  assetsTotal: number;
  liabilitiesTotal: number;
  currency: SupportedCurrency;
  showValues: boolean;
  accountCount: number;
  debtCount: number;
  valuation: NetWorthValuationQuality;
}) {
  const quoteRange =
    valuation.oldestQuoteReferenceAt && valuation.latestQuoteReferenceAt
      ? valuation.oldestQuoteReferenceAt === valuation.latestQuoteReferenceAt
        ? quoteDateTimeLabel(valuation.latestQuoteReferenceAt)
        : `${quoteDateTimeLabel(valuation.oldestQuoteReferenceAt)} → ${quoteDateTimeLabel(valuation.latestQuoteReferenceAt)}`
      : null;

  return (
    <article className="relative overflow-hidden rounded-[22px] border border-[var(--orbit-primary)]/45 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--orbit-primary)_34%,var(--surface))_0%,color-mix(in_srgb,#312e81_40%,var(--surface))_55%,color-mix(in_srgb,#111827_90%,var(--surface))_100%)] p-5 text-white shadow-[var(--shadow-surface)] sm:p-6">
      <FaChartLine
        className="pointer-events-none absolute -right-3 -top-1 text-[110px] text-white/5"
        aria-hidden="true"
      />
      <div className="relative z-[1]">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white/75">
          <FaEye aria-hidden="true" />
          <span>Patrimônio líquido em {currency}</span>
          <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs">
            {valuationBasisLabel(valuation.basis)}
          </span>
        </div>
        <strong className="mt-3 block break-words text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">
          {displayMoney(total, showValues, currency)}
        </strong>
        <p className="mt-2 text-xs text-white/65">
          Snapshot em {logicalDateLabel(valuation.asOf)}.
          {valuation.positionCount > 0
            ? ` ${valuation.marketPositionCount} de ${valuation.positionCount} posições usam cotação de mercado.`
            : ' Base integralmente transacional.'}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[14px] bg-white/10 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/65">
              Ativos
            </span>
            <strong className="mt-1 block text-lg">
              {displayMoney(assetsTotal, showValues, currency)}
            </strong>
            <span className="mt-1 block text-xs text-white/60">
              {accountCount} {accountCount === 1 ? 'conta elegível' : 'contas elegíveis'}
            </span>
          </div>
          <div className="rounded-[14px] bg-white/10 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/65">
              Passivos
            </span>
            <strong className="mt-1 block text-lg">
              {displayMoney(liabilitiesTotal, showValues, currency)}
            </strong>
            <span className="mt-1 block text-xs text-white/60">
              {debtCount} {debtCount === 1 ? 'dívida com saldo' : 'dívidas com saldo'}
            </span>
          </div>
        </div>

        {valuation.positionCount > 0 && (
          <div className="mt-4 rounded-[14px] border border-white/15 bg-black/10 p-3 text-xs leading-relaxed text-white/70">
            {valuation.compositionStatus ===
              'UNRECONCILED_TRANSACTION_BALANCE' && (
              <p className="mb-2 font-semibold text-[var(--warning)]">
                Composição não conciliada: existe saldo transacional junto com
                posições. O total usa as posições e preserva{' '}
                {showValues
                  ? formatCurrency(
                      valuation.unreconciledTransactionBalance,
                      currency,
                    )
                  : '••••'}{' '}
                como referência transacional sem somá-lo automaticamente.
              </p>
            )}
            <p>
              Cobertura de mercado: {valuation.quoteCoveragePercentage.toLocaleString('pt-BR')}%.
              {valuation.costPositionCount > 0
                ? ` ${valuation.costPositionCount} ${valuation.costPositionCount === 1 ? 'posição usa' : 'posições usam'} custo por falta de cotação elegível.`
                : ''}
            </p>
            {quoteRange && <p className="mt-1">Referência das cotações: {quoteRange} UTC.</p>}
            {valuation.staleMarketPositionCount > 0 && (
              <p className="mt-1 font-semibold text-[var(--warning)]">
                {valuation.staleMarketPositionCount}{' '}
                {valuation.staleMarketPositionCount === 1
                  ? 'posição usa cotação com mais de 7 dias.'
                  : 'posições usam cotações com mais de 7 dias.'}{' '}
                <Link href="/investimentos" className="underline underline-offset-2">
                  Revisar investimentos
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
