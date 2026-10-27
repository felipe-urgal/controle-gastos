'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { FaChevronDown } from 'react-icons/fa';

import { displayMoney, displayPercent, logicalDateLabel, quoteDateTimeLabel, valuationBasisLabel } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';
import { liabilityShare, summarizeQuality, type NetWorthVariation } from '@/app/components/pages/net-worth/net-worth-page/net-worth-model';
import { CARD_EASE, CountUp, PopBox, reducedTransition } from '@/app/components/ui/motion';
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
  const reduce = useReducedMotion();
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
    <motion.section
      aria-labelledby="net-worth-hero-label"
      // A visão geral "se aproxima": o cartão cresce do centro, nitidificando.
      initial={reduce ? false : { opacity: 0, scale: 0.88, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={reducedTransition(reduce, { type: 'spring', stiffness: 130, damping: 18, delay: 0.1 })}
      className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-6"
    >
      <div>
        <p id="net-worth-hero-label" className="text-sm font-semibold text-[var(--text-muted)]">
          Patrimônio líquido em {currency}
        </p>
        <strong className="money mt-2 block break-words text-3xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl">
          <CountUp amount={total} format={(cents) => displayMoney(cents, showValues, currency)} />
        </strong>
        {variation && (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {variation.percent !== null && (
              <motion.span
                className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${up ? 'bg-[var(--surface-raised)] text-[var(--income)]' : 'bg-[var(--danger-subtle)] text-[var(--expense)]'}`}
                initial={reduce ? false : { scale: 0.4, opacity: 0, y: up ? 12 : -12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.8 }}
              >
                {up ? '▲' : '▼'} {displayPercent(Math.abs(variation.percent), showValues).replace('+', '')}
              </motion.span>
            )}
            <span className="money font-semibold">
              {showValues ? `${up ? '+' : '−'}${formatCurrency(Math.abs(variation.amount), currency)}` : '••••'}
            </span>
            <span className="text-[var(--text-muted)]">em {months} {months === 1 ? 'mês' : 'meses'}</span>
          </p>
        )}
      </div>

      <div className="grid gap-3">
        {share !== null && liabilitiesTotal > 0 && (
          <div className="grid gap-1.5">
            <div
              className="flex h-3 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
              role="img"
              aria-label={`Dívidas equivalem a ${share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos ativos`}
            >
              {/* Ativos preenchem primeiro; a fatia das dívidas vem depois, "mordendo" o final. */}
              <motion.span
                className="h-full bg-[var(--primary)]"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${100 - debtWidth}%` }}
                transition={reducedTransition(reduce, { duration: 0.9, ease: CARD_EASE, delay: 0.5 })}
              />
              <motion.span
                className="h-full bg-[var(--expense)] opacity-85"
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${debtWidth}%` }}
                transition={reducedTransition(reduce, { duration: 0.7, ease: CARD_EASE, delay: 1.1 })}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              As dívidas equivalem a <strong className="text-[var(--foreground)]">{share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</strong> dos ativos.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Stat dot="var(--primary)" label="Ativos" value={displayMoney(assetsTotal, showValues, currency)} detail={`${accountCount} ${accountCount === 1 ? 'conta elegível' : 'contas elegíveis'}`} />
          <Stat dot="var(--expense)" label="Passivos" value={displayMoney(liabilitiesTotal, showValues, currency)} detail={`${debtCount} ${debtCount === 1 ? 'dívida com saldo' : 'dívidas com saldo'}`} />
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
    </motion.section>
  );
}

function Stat({ label, value, detail, dot }: { label: string; value: string; detail: string; dot?: string }) {
  return (
    <PopBox whileHover="hover" className="grid min-w-0 content-start gap-0.5 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3 py-3 sm:px-4 sm:py-3.5">
      <span className="flex items-center gap-2 truncate text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
        {dot && (
          <motion.span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} aria-hidden="true" variants={{ hover: { scale: [1, 2, 1], transition: { duration: 0.5 } } }} />
        )}
        {label}
      </span>
      <motion.span className="money origin-left truncate text-base font-semibold sm:text-xl" variants={{ hover: { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
        {value}
      </motion.span>
      <span className="text-xs text-[var(--text-muted)]">{detail}</span>
    </PopBox>
  );
}
