'use client';

import { FormEvent } from 'react';
import { FaTrash } from 'react-icons/fa';
import { Button, Chip, ChipRow, IconButton, Input, Select } from '@/app/components/ui';
import { ExchangeRateModel } from '@/app/types/exchange-rate';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { currencies, currentIsoDate, logicalDateLabel, rateProvenanceLabel, rateRatioLabel } from '@/app/components/pages/net-worth/net-worth-page/net-worth-helpers';

const currencyOptions = currencies.map((currency) => ({ value: currency, label: currency }));

export function ExchangeRatesCard({
  rates,
  loading,
  moreLoading,
  hasMore,
  total,
  filterFrom,
  filterTo,
  sourceTab,
  notice,
  error,
  saving,
  fetchingPtax,
  from,
  to,
  value,
  referenceDate,
  showValues,
  onFilterFromChange,
  onFilterToChange,
  onSourceTabChange,
  onFromChange,
  onToChange,
  onValueChange,
  onReferenceDateChange,
  onSave,
  onFetchPtax,
  onLoadMore,
  onRemove,
}: {
  rates: ExchangeRateModel[];
  loading: boolean;
  moreLoading: boolean;
  hasMore: boolean;
  total: number;
  filterFrom: SupportedCurrency | '';
  filterTo: SupportedCurrency | '';
  sourceTab: ExchangeRateModel['source'];
  notice: string;
  error: string;
  saving: boolean;
  fetchingPtax: boolean;
  from: SupportedCurrency;
  to: SupportedCurrency;
  value: string;
  referenceDate: string;
  showValues: boolean;
  onFilterFromChange: (currency: SupportedCurrency | '') => void;
  onFilterToChange: (currency: SupportedCurrency | '') => void;
  onSourceTabChange: (source: ExchangeRateModel['source']) => void;
  onFromChange: (currency: SupportedCurrency) => void;
  onToChange: (currency: SupportedCurrency) => void;
  onValueChange: (value: string) => void;
  onReferenceDateChange: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onFetchPtax: () => void;
  onLoadMore: () => void;
  onRemove: (rate: ExchangeRateModel) => void;
}) {
  const futureReference = referenceDate > currentIsoDate();

  return (
    <article className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Taxas de câmbio
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Use uma taxa manual ou consulte a PTAX oficial sob demanda. A consolidação
          usa somente a taxa mais recente na data ou antes dela (SELL por padrão);
          taxa futura nunca entra no snapshot atual. Taxa manual é um override
          editável: salvar ou excluir recalcula consolidações, inclusive de períodos
          anteriores. A apuração fiscal de investimentos no exterior usa somente PTAX.
        </p>
      </div>

      <form
        onSubmit={onSave}
        noValidate
        className="mt-4 grid gap-3 rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-3 md:grid-cols-[minmax(0,7.5rem)_minmax(0,7.5rem)_minmax(0,1fr)_minmax(0,10.5rem)_auto] md:items-end"
      >
        <div>
          <span className="ds-label mb-2 block" aria-hidden="true">De</span>
          <Select
            ariaLabel="Moeda de origem da taxa"
            value={from}
            onChange={(value) => onFromChange(value as SupportedCurrency)}
            options={currencyOptions}
          />
        </div>

        <div>
          <span className="ds-label mb-2 block" aria-hidden="true">Para</span>
          <Select
            ariaLabel="Moeda de destino da taxa"
            value={to}
            onChange={(value) => onToChange(value as SupportedCurrency)}
            options={currencyOptions}
          />
        </div>

        <Input
          label={`Taxa para 1 ${from}`}
          aria-label="Valor da taxa manual"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          inputMode="decimal"
          enterKeyHint="done"
          placeholder={`Ex.: 5,32 ${to}`}
        />

        <Input
          label="Data de referência"
          aria-label="Data de referência da taxa"
          type="date"
          value={referenceDate}
          onChange={(event) => onReferenceDateChange(event.target.value)}
          min="2000-01-01"
          max={currentIsoDate()}
        />

        <div className="flex gap-2 md:flex-col">
          <Button type="submit" disabled={saving || fetchingPtax} className="flex-1">
            {saving ? 'Salvando…' : 'Salvar manual'}
          </Button>
          <Button type="button" variant="outline" onClick={onFetchPtax} disabled={saving || fetchingPtax} className="flex-1">
            {fetchingPtax ? 'Consultando…' : 'Buscar PTAX'}
          </Button>
        </div>
      </form>

      {futureReference && (
        <p className="mt-2 text-xs text-[var(--expense)]">
          Taxas de câmbio factuais não aceitam data futura.
        </p>
      )}

      {notice && !error && (
        <p role="status" className="mt-3 text-sm text-[var(--text-muted)]">
          {notice}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-[var(--radius-md)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      <ChipRow label="Origem das taxas" className="mt-5">
        {(
          [
            ['MANUAL', 'Manuais'],
            ['BCB_PTAX', 'PTAX'],
          ] as const
        ).map(([source, label]) => (
          <Chip key={source} selected={sourceTab === source} onClick={() => onSourceTabChange(source)}>
            {label}
          </Chip>
        ))}
      </ChipRow>
      {sourceTab === 'BCB_PTAX' && (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Inclui cotações buscadas por você e as importadas pela apuração fiscal de
          investimentos no exterior. Esta lista não pode ser excluída aqui.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-bold text-[var(--foreground)]">
            Histórico de taxas
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {total} {total === 1 ? 'registro' : 'registros'} no filtro atual.
          </p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
          <Select
            ariaLabel="Filtrar taxas por moeda de origem"
            value={filterFrom}
            onChange={(value) => onFilterFromChange(value as SupportedCurrency | '')}
            options={currencyOptions}
            placeholder="Todas origens"
          />
          <Select
            ariaLabel="Filtrar taxas por moeda de destino"
            value={filterTo}
            onChange={(value) => onFilterToChange(value as SupportedCurrency | '')}
            options={currencyOptions}
            placeholder="Todos destinos"
          />
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div
            className="h-20 animate-pulse rounded-[var(--radius-md)] bg-[var(--skeleton)]"
            role="status"
            aria-label="Carregando taxas de câmbio"
          />
        ) : rates.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
            Nenhuma taxa de câmbio encontrada.
          </p>
        ) : (
          <>
            <div className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)] px-3">
              {rates.map((rate) => (
                <div
                  key={rate.id}
                  className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_44px] items-center gap-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="block text-sm text-[var(--foreground)]">
                        {rate.from} → {rate.to}
                      </strong>
                      {rate.source === 'BCB_PTAX' && (
                        <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                          PTAX {rate.quoteSide === 'BUY' ? 'compra' : 'venda'}
                          {rate.provenance === 'PTAX_CROSS' && ' · derivada'}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      {showValues
                        ? `1 ${rate.from} = ${rateRatioLabel(rate)} ${rate.to}`
                        : `1 ${rate.from} = •••• ${rate.to}`}
                      {' · '}
                      {logicalDateLabel(rate.referenceDate)}
                      {' · '}
                      {rate.source}
                      {' · atualizada em '}
                      {new Date(rate.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                    {rate.provenance === 'PTAX_CROSS' && (
                      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                        {rateProvenanceLabel(rate.provenance, rate.from, rate.to)}
                      </span>
                    )}
                  </div>
                  {rate.source === 'MANUAL' ? (
                    <IconButton
                      label={`Excluir taxa ${rate.from} para ${rate.to}`}
                      icon={<FaTrash />}
                      tone="danger"
                      onClick={() => onRemove(rate)}
                      className="border border-[var(--border)]"
                    />
                  ) : (
                    <span
                      className="text-center text-xs font-bold text-[var(--text-muted)]"
                      title="Banco Central do Brasil"
                    >
                      BCB
                    </span>
                  )}
                </div>
              ))}
            </div>

            {hasMore && (
              <Button type="button" variant="outline" fullWidth className="mt-3" onClick={onLoadMore} disabled={moreLoading}>
                {moreLoading ? 'Carregando…' : 'Carregar mais taxas'}
              </Button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
