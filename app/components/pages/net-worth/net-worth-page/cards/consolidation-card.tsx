'use client';

import { Select } from '@/app/components/ui';
import { FaExchangeAlt } from 'react-icons/fa';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { NetWorthData } from '@/app/types/net-worth';
import { currencies, displayMoney, logicalDateLabel, rateProvenanceLabel, rateRatioLabel } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';

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

        <div className="w-full sm:w-auto sm:min-w-[13rem]">
          <Select
            label="Consolidar patrimônio em"
            value={baseCurrency}
            onChange={(value) => onBaseCurrencyChange(value as SupportedCurrency | '')}
            options={currencies.map((currency) => ({ value: currency, label: currency }))}
            placeholder="Sem consolidação"
          />
        </div>
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
