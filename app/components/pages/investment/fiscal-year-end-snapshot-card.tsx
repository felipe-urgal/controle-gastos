'use client';

import { useCallback, useEffect, useState } from 'react';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { investmentService } from '@/app/services/investment-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { InvestmentFiscalYearEndSnapshot } from '@/app/types/investment';

function quantityLabel(value: string) {
  return value.replace('.', ',');
}

export function FiscalYearEndSnapshotCard({
  showValues,
}: {
  showValues: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const lastClosedYear = currentYear - 1;
  const [year, setYear] = useState(lastClosedYear);
  const [snapshot, setSnapshot] =
    useState<InvestmentFiscalYearEndSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (selectedYear: number) => {
    setLoading(true);
    setError('');
    try {
      const response =
        await investmentService.getFiscalYearEndSnapshot(selectedYear);
      setSnapshot(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível gerar o snapshot fiscal',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year);
  }, [load, year]);

  const years = Array.from(
    { length: 6 },
    (_, index) => lastClosedYear - index,
  );

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Fechamento fiscal em 31/12
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Quantidade e custo fiscal no fim do ano-calendário, sem usar valor
            de mercado como custo.
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
          Ano
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="ds-control min-h-10 px-3 text-sm"
            disabled={loading}
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Gerando snapshot fiscal...
        </p>
      ) : error ? (
        <p className="mt-4 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      ) : !snapshot ? null : snapshot.current.items.length === 0 &&
        snapshot.previous.items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhum investimento com histórico fiscal até 31/12/{year}.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SnapshotTotals
              label={'31/12/' + String(year - 1)}
              totals={snapshot.previous.totalsByCurrency}
              showValues={showValues}
            />
            <SnapshotTotals
              label={'31/12/' + String(year)}
              totals={snapshot.current.totalsByCurrency}
              showValues={showValues}
            />
          </div>

          <div className="mt-4 divide-y divide-[var(--border)]">
            {snapshot.comparison.map((item) => {
              const current = snapshot.current.items.find(
                (candidate) => candidate.assetId === item.assetId,
              );
              const previous = snapshot.previous.items.find(
                (candidate) => candidate.assetId === item.assetId,
              );
              const context = current ?? previous;

              return (
                <div
                  key={item.assetId}
                  className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-[var(--foreground)]">
                        {item.symbol}
                      </strong>
                      <span
                        className={
                          'rounded-full border px-2 py-0.5 text-[11px] font-bold ' +
                          (item.status === 'OK'
                            ? 'border-[var(--income)]/35 text-[var(--income)]'
                            : 'border-amber-500/35 text-amber-400')
                        }
                      >
                        {item.status === 'OK' ? 'Conciliado' : 'Pendente'}
                      </span>
                    </div>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      {context?.institutions.length
                        ? 'Custódia/contexto: ' +
                          context.institutions.join(', ')
                        : 'Sem instituição identificada'}
                    </span>
                    {context?.pending[0] && (
                      <span className="mt-1 block text-xs leading-relaxed text-amber-400">
                        {context.pending[0].message}
                      </span>
                    )}
                  </div>

                  <SnapshotValue
                    label={String(year - 1)}
                    quantity={item.previousQuantity}
                    costBasisCents={item.previousCostBasisCents}
                    currency={item.currency}
                    showValues={showValues}
                  />
                  <SnapshotValue
                    label={String(year)}
                    quantity={item.currentQuantity}
                    costBasisCents={item.currentCostBasisCents}
                    currency={item.currency}
                    showValues={showValues}
                  />
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
            Ativos totalmente vendidos continuam no comparativo com quantidade
            e custo zero no fechamento seguinte. Pendências da camada fiscal
            são preservadas no snapshot.
          </p>
        </>
      )}
    </article>
  );
}

function SnapshotTotals({
  label,
  totals,
  showValues,
}: {
  label: string;
  totals: Partial<Record<SupportedCurrency, number>>;
  showValues: boolean;
}) {
  const entries = Object.entries(totals).filter(
    (entry): entry is [SupportedCurrency, number] =>
      typeof entry[1] === 'number',
  );

  return (
    <div className="rounded-[14px] bg-[var(--surface-raised)] p-4">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        Custo fiscal · {label}
      </span>
      {entries.length === 0 ? (
        <strong className="mt-1 block text-base text-[var(--foreground)]">
          Sem posição
        </strong>
      ) : (
        entries.map(([currency, amount]) => (
          <strong
            key={currency}
            className="mt-1 block text-lg text-[var(--foreground)]"
          >
            {showValues ? formatCurrency(amount, currency) : '••••'} {currency}
          </strong>
        ))
      )}
    </div>
  );
}

function SnapshotValue({
  label,
  quantity,
  costBasisCents,
  currency,
  showValues,
}: {
  label: string;
  quantity: string;
  costBasisCents: number;
  currency: string;
  showValues: boolean;
}) {
  return (
    <div className="min-w-[130px] text-left md:text-right">
      <span className="block text-[11px] font-semibold text-[var(--text-muted)]">
        31/12/{label}
      </span>
      <strong className="mt-1 block text-sm text-[var(--foreground)]">
        {quantityLabel(quantity)} un.
      </strong>
      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
        {showValues ? formatCurrency(costBasisCents, currency) : '••••'}
      </span>
    </div>
  );
}
