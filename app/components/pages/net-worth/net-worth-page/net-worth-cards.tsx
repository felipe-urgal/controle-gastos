'use client';

import Link from 'next/link';
import { FaChartLine, FaEye, FaExchangeAlt } from 'react-icons/fa';
import { IconRenderer } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { NetWorthAccount, NetWorthData, NetWorthDebt, NetWorthRealReturnData, NetWorthValuationQuality } from '@/app/types/net-worth';
import { currencies, displayMoney, displayPercent, logicalDateLabel, monthShort, quoteDateTimeLabel, rateProvenanceLabel, rateRatioLabel, valuationBasisLabel } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';

export function ConsolidationCard({
  consolidation,
  baseCurrency,
  onBaseCurrencyChange,
  showValues,
}: {
  consolidation: NetWorthData['consolidation'];
  baseCurrency: SupportedCurrency | '';
  onBaseCurrencyChange: (currency: SupportedCurrency | '') => void;
  showValues: boolean;
}) {
  return (
    <article className="min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FaExchangeAlt className="text-[var(--orbit-primary)]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Consolidação opcional
            </h2>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Por padrão, o patrimônio continua separado por moeda. A conversão só acontece quando você escolhe uma moeda base.
          </p>
        </div>

        <label className="block min-w-[210px]">
          <span className="ds-label mb-2 block">Consolidar patrimônio em</span>
          <select
            value={baseCurrency}
            onChange={(event) =>
              onBaseCurrencyChange(event.target.value as SupportedCurrency | '')
            }
            className="ds-control min-h-11 w-full px-3"
            aria-label="Consolidar patrimônio em"
          >
            <option value="">Sem consolidação</option>
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!baseCurrency ? (
        <div className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          Nenhuma moeda está sendo convertida. Os totais nominais abaixo permanecem a fonte original.
        </div>
      ) : consolidation ? (
        <div className="mt-4 space-y-3">
          <div
            className={`rounded-[14px] border p-4 ${
              consolidation.complete && !consolidation.stale
                ? 'border-[var(--income)]/30 bg-[var(--primary-subtle)]'
                : 'border-[var(--expense)]/30 bg-[var(--danger-subtle)]'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {!consolidation.complete
                ? 'Consolidação incompleta'
                : consolidation.stale
                  ? 'Estimativa com taxa defasada'
                  : 'Patrimônio convertido'}
            </span>
            <strong className="mt-1 block text-2xl font-extrabold text-[var(--foreground)]">
              {consolidation.total === null
                ? '—'
                : displayMoney(
                    consolidation.total,
                    showValues,
                    consolidation.baseCurrency,
                  )}
            </strong>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Base {consolidation.baseCurrency} · referência {logicalDateLabel(consolidation.referenceDate)}
            </p>
          </div>

          {consolidation.complete && consolidation.stale && (
            <p className="rounded-[12px] border border-[var(--expense)]/25 p-3 text-sm text-[var(--text-muted)]">
              O total usa ao menos uma taxa com mais de 7 dias de defasagem e deve
              ser lido como estimativa. Cadastre ou busque uma taxa mais recente.
            </p>
          )}

          {consolidation.missingRates.length > 0 && (
            <div className="rounded-[12px] border border-[var(--expense)]/25 p-3">
              <strong className="text-sm text-[var(--expense)]">
                Faltam taxas para concluir a conversão:
              </strong>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {consolidation.missingRates
                  .map((item) => `${item.from} → ${item.to}`)
                  .join(', ')}
              </p>
            </div>
          )}

          <div className="divide-y divide-[var(--border)] rounded-[12px] border border-[var(--border)] px-3">
            {consolidation.convertedItems.map((item) => (
              <div
                key={item.original.currency}
                className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div>
                  <strong className="text-sm text-[var(--foreground)]">
                    {item.original.currency} → {item.converted.currency}
                  </strong>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.rate
                      ? showValues
                        ? `1 ${item.rate.from} = ${rateRatioLabel(item.rate)} ${item.rate.to} · ${item.rate.source} · ${logicalDateLabel(item.rate.referenceDate)}`
                        : `Taxa •••• · ${item.rate.source} · ${logicalDateLabel(item.rate.referenceDate)}`
                      : 'Mesma moeda, sem conversão'}
                  </p>
                  {item.resolution && (
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--text-muted)]">
                      <li
                        className={
                          item.resolution.freshness === 'STALE'
                            ? 'font-semibold text-[var(--expense)]'
                            : undefined
                        }
                      >
                        Taxa de {logicalDateLabel(item.rate!.referenceDate)} ·{' '}
                        {item.resolution.ageDays === 0
                          ? 'hoje'
                          : `${item.resolution.ageDays} ${item.resolution.ageDays === 1 ? 'dia' : 'dias'} atrás`}
                        {item.resolution.freshness === 'STALE' &&
                          ' · defasada'}
                      </li>
                      <li>
                        {rateProvenanceLabel(
                          item.resolution.provenance,
                          item.rate!.from,
                          item.rate!.to,
                        )}
                        {item.resolution.derivedFromInverse &&
                          ' · inversa da taxa cadastrada no sentido oposto'}
                      </li>
                      {item.resolution.overridesPtax && (
                        <li className="font-semibold text-[var(--foreground)]">
                          Override manual em uso: existe PTAX na mesma data. Para
                          usar a PTAX, exclua a taxa manual desta data.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                <span className="text-sm font-bold text-[var(--foreground)]">
                  {displayMoney(
                    item.original.amount,
                    showValues,
                    item.original.currency,
                  )}
                  {' → '}
                  {displayMoney(
                    item.converted.amount,
                    showValues,
                    item.converted.currency,
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

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
        <strong className="mt-3 block break-words text-[38px] font-extrabold leading-none tracking-tight sm:text-[44px]">
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

export function RealReturnCard({
  data,
  summary,
  showValues,
}: {
  data: NetWorthRealReturnData['byCurrency'][number];
  summary: NetWorthRealReturnData;
  showValues: boolean;
}) {
  const nominalOnly = data.status === 'NOMINAL_ONLY';
  const statusMessage =
    data.status === 'BASELINE_NOT_POSITIVE'
      ? 'A variação percentual exige patrimônio inicial positivo.'
      : data.status === 'INFLATION_INCOMPLETE'
        ? `IPCA disponível em ${summary.inflation.availableMonths} de ${summary.inflation.expectedMonths} meses. A evolução real em BRL só aparece quando o período estiver completo.`
        : nominalOnly
          ? `Em ${data.currency}, a evolução permanece nominal na moeda original. O IPCA brasileiro não é aplicado sem conversão histórica auditável para BRL.`
          : null;

  return (
    <article className="min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Evolução patrimonial
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {monthShort(summary.period.start.year, summary.period.start.month)} →{' '}
            {monthShort(summary.period.end.year, summary.period.end.month)} ·{' '}
            {summary.period.months} meses · {data.currency}.
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
          {data.currency === 'BRL'
            ? `BRL real · IPCA SGS ${summary.inflation.seriesCode}`
            : `${data.currency} nominal`}
        </span>
      </div>

      <dl
        className={`mt-4 grid gap-3 sm:grid-cols-2 ${data.currency === 'BRL' ? 'xl:grid-cols-5' : 'xl:grid-cols-3'}`}
      >
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Patrimônio inicial</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayMoney(data.initial, showValues, data.currency)}
          </dd>
        </div>
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Patrimônio final</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayMoney(data.current, showValues, data.currency)}
          </dd>
        </div>
        <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
          <dt className="text-xs text-[var(--text-muted)]">Variação nominal</dt>
          <dd className="mt-1 font-bold text-[var(--foreground)]">
            {displayPercent(data.nominalPercentage, showValues)}
          </dd>
        </div>
        {data.currency === 'BRL' && (
          <>
            <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
              <dt className="text-xs text-[var(--text-muted)]">IPCA do período</dt>
              <dd className="mt-1 font-bold text-[var(--foreground)]">
                {displayPercent(summary.inflation.percentage, showValues)}
              </dd>
            </div>
            <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
              <dt className="text-xs text-[var(--text-muted)]">Evolução real</dt>
              <dd className="mt-1 font-bold text-[var(--foreground)]">
                {displayPercent(data.realPercentage, showValues)}
              </dd>
            </div>
          </>
        )}
      </dl>

      {statusMessage && (
        <p className="mt-3 rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs text-[var(--text-muted)]">
          {statusMessage}
        </p>
      )}

      <div className="mt-3 space-y-1 text-xs leading-relaxed text-[var(--text-muted)]">
        <p>
          Esta métrica mede evolução patrimonial e inclui aportes, retiradas e
          reavaliações de passivos. Não representa rentabilidade isolada de investimentos.
        </p>
        <p>
          A série usa a base contábil histórica: transações concluídas menos passivos
          pela data efetiva. Não reconstrói mercado passado com cotação atual.
        </p>
        {data.currency === 'BRL' && (
          <p>
            Fonte de inflação: {summary.inflation.sourceLabel} · série{' '}
            {summary.inflation.seriesCode}. Fórmula: {summary.formula}. {summary.rounding}.
          </p>
        )}
      </div>
    </article>
  );
}

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

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[250px] min-w-[620px] w-full"
          role="img"
          aria-label={`Evolução contábil mensal do patrimônio em ${currency}`}
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
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--orbit-primary)]"
            />
          )}
          {points.map((point) => (
            <g key={`${point.year}-${point.month}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="currentColor"
                className="text-[var(--orbit-primary)]"
              />
              <title>
                {monthShort(point.year, point.month)}:{' '}
                {displayMoney(point.value, showValues, currency)}
              </title>
            </g>
          ))}
        </svg>
      </div>

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
        <summary className="cursor-pointer min-h-11 px-3 py-3 text-sm font-bold text-[var(--foreground)]">
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
                    {displayMoney(item.value, showValues, currency)}
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

export function DistributionCard({
  accounts,
  currency,
  showValues,
}: {
  accounts: NetWorthAccount[];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  const totalAbsolute = accounts.reduce(
    (sum, account) => sum + Math.abs(account.balance),
    0,
  );

  return (
    <article className="min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Distribuição por conta
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Correntes e investimentos no snapshot selecionado.
        </p>
      </div>

      {accounts.length === 0 ? (
        <p className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          Nenhum ativo registrado nesta moeda.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-[var(--border)]">
          {accounts.map((account) => {
            const share =
              totalAbsolute === 0
                ? 0
                : Math.round((Math.abs(account.balance) / totalAbsolute) * 1000) /
                  10;
            const investment = account.type === 'INVESTMENT';
            const detailHref = investment
              ? '/investimentos'
              : `/contas/show/${account.id}`;

            return (
              <Link
                key={account.id}
                href={detailHref}
                className="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-2.5"
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-[11px] text-white"
                  style={{ backgroundColor: account.color || '#64748B' }}
                  aria-hidden="true"
                >
                  <IconRenderer
                    iconName={
                      account.icon ||
                      (investment ? 'chart-line' : 'wallet')
                    }
                    size={18}
                  />
                </span>

                <span className="min-w-0">
                  <strong className="block truncate text-sm text-[var(--foreground)]">
                    {account.name}
                  </strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {investment
                      ? `Investimento · ${valuationBasisLabel(account.valuationBasis)}`
                      : 'Conta corrente · saldo transacional'}
                    {!account.isActive ? ' · Inativa' : ''}
                  </span>
                  {investment && account.cashBalance !== undefined && (
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
                      O valor das posições substitui o saldo transacional
                      {showValues
                        ? ` (${formatCurrency(account.cashBalance, currency)})`
                        : ''};
                      os dois não são somados sem conciliação auditável.
                    </span>
                  )}
                  {investment &&
                    (account.staleMarketPositionCount ?? 0) > 0 && (
                      <span className="mt-1 block text-xs font-semibold text-[var(--warning)]">
                        {account.staleMarketPositionCount}{' '}
                        {account.staleMarketPositionCount === 1
                          ? 'cotação stale'
                          : 'cotações stale'}
                      </span>
                    )}
                </span>

                <span className="text-right">
                  <strong
                    className={
                      account.balance < 0
                        ? 'block text-sm text-[var(--expense)]'
                        : 'block text-sm text-[var(--foreground)]'
                    }
                  >
                    {displayMoney(account.balance, showValues, currency)}
                  </strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {share.toLocaleString('pt-BR')}%
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
        Transferências entre suas contas não alteram o total consolidado.
        Em contas de investimento, posições substituem o saldo transacional
        quando existe uma posição calculável. Caixa e posições não são somados
        automaticamente para evitar dupla contagem.
      </div>
    </article>
  );
}

export function LiabilitiesCard({
  debts,
  currency,
  showValues,
}: {
  debts: NetWorthDebt[];
  currency: SupportedCurrency;
  showValues: boolean;
}) {
  return (
    <article className="min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Passivos</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Dívidas com saldo devedor nesta moeda.
          </p>
        </div>
        <Link href="/dividas" className="text-xs font-bold text-[var(--orbit-primary)]">
          Gerenciar
        </Link>
      </div>

      {debts.length === 0 ? (
        <p className="mt-4 rounded-[12px] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          Nenhum passivo com saldo devedor.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-[var(--border)]">
          {debts.map((debt) => (
            <Link
              key={debt.id}
              href={`/dividas#debt-${encodeURIComponent(debt.id)}`}
              className="flex min-h-[64px] items-center justify-between gap-4 py-2.5"
            >
              <span className="min-w-0">
                <strong className="block truncate text-sm text-[var(--foreground)]">{debt.name}</strong>
                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                  {debt.institution || 'Passivo manual'}
                </span>
              </span>
              <strong className="shrink-0 text-sm text-[var(--expense)]">
                {displayMoney(debt.balance, showValues, currency)}
              </strong>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
