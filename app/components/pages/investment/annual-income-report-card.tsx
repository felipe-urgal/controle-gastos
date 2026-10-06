'use client';

import { useEffect, useState } from 'react';

import { useInvestmentFiscalYear } from '@/app/components/pages/investment/investment-fiscal-year-context';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { investmentService } from '@/app/services/investment-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type {
  InvestmentAnnualIncomeReport,
  InvestmentIncomeType,
} from '@/app/types/investment';

const incomeLabels: Record<InvestmentIncomeType, string> = {
  INCOME: 'Rendimento',
  DIVIDEND: 'Dividendo',
  INTEREST: 'Juros',
  OTHER: 'Outro',
};

function quantityLabel(value: string) {
  return value.replace('.', ',');
}

export function AnnualIncomeReportCard({
  showValues,
}: {
  showValues: boolean;
}) {
  const currentYear = new Date().getUTCFullYear();
  const { year, setYear } = useInvestmentFiscalYear();
  const [report, setReport] = useState<InvestmentAnnualIncomeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    void investmentService
      .getAnnualIncomeReport(year)
      .then((response) => {
        if (cancelled) return;
        setReport(response.data);
        setError('');
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Não foi possível consolidar os rendimentos',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  function changeYear(selectedYear: number) {
    setYear(selectedYear);
  }

  const years = Array.from({ length: 6 }, (_, index) => currentYear - index);

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Rendimentos do ano
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Consolidação por ativo, tipo e instituição, mantendo cada pagamento
            disponível para conferência.
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
          Ano
          <select
            value={year}
            onChange={(event) => void changeYear(Number(event.target.value))}
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
          Consolidando rendimentos...
        </p>
      ) : error ? (
        <p className="mt-4 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      ) : !report || report.eventCount === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhum rendimento registrado em {year}.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(report.totalsByCurrency)
              .filter(
                (entry): entry is [SupportedCurrency, number] =>
                  typeof entry[1] === 'number',
              )
              .map(([currency, amount]) => (
                <div
                  key={currency}
                  className="rounded-[14px] bg-[var(--surface-raised)] p-4"
                >
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    Total anual · {currency}
                  </span>
                  <strong className="mt-1 block text-xl text-[var(--foreground)]">
                    {showValues ? formatCurrency(amount, currency) : '••••'}
                  </strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    {report.eventCount} pagamento(s) no relatório
                  </span>
                </div>
              ))}
          </div>

          {report.pending.length > 0 && (
            <div className="mt-4 rounded-[14px] bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
              <strong className="block text-sm">
                {report.pending.length} pendência(s) fiscal(is)
              </strong>
              <span className="mt-1 block">{report.pending[0]?.message}</span>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {report.items.map((item) => (
              <details
                key={[item.assetId, item.incomeType, item.institutionId].join(':')}
                className="rounded-[14px] border border-[var(--border)]"
              >
                <summary className="cursor-pointer list-none p-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-[var(--foreground)]">
                          {item.symbol}
                        </strong>
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
                          {incomeLabels[item.incomeType]}
                        </span>
                        {item.pending.length > 0 && (
                          <span className="rounded-full border border-amber-500/35 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                            Revisar
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                        {item.institutionName} · {item.eventCount} pagamento(s)
                      </span>
                    </div>
                    <strong className="text-sm text-[var(--foreground)]">
                      {showValues
                        ? formatCurrency(item.netAmountCents, item.currency)
                        : '••••'}
                    </strong>
                  </div>
                </summary>

                <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
                  {item.pending[0] && (
                    <p className="mb-3 text-xs leading-relaxed text-amber-400">
                      {item.pending[0].message}
                    </p>
                  )}

                  <div className="space-y-2">
                    {item.events.map((event) => (
                      <div
                        key={event.id}
                        className="grid gap-2 rounded-xl bg-[var(--surface-raised)] p-3 text-xs sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                      >
                        <span className="font-semibold text-[var(--foreground)]">
                          {new Intl.DateTimeFormat('pt-BR').format(
                            new Date(event.date + 'T12:00:00Z'),
                          )}
                        </span>
                        <span className="text-[var(--text-muted)]">
                          {quantityLabel(event.quantity)} un. · unitário{' '}
                          {showValues
                            ? formatCurrency(event.unitValueCents, item.currency)
                            : '••••'}
                          {event.note ? ' · ' + event.note : ''}
                        </span>
                        <strong className="text-[var(--foreground)] sm:text-right">
                          {showValues
                            ? formatCurrency(event.netAmountCents, item.currency)
                            : '••••'}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
