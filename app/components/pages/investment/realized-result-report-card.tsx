'use client';

import { useEffect, useState } from 'react';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { investmentService } from '@/app/services/investment-service';
import type { InvestmentRealizedResultReport } from '@/app/types/investment';

const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

export function RealizedResultReportCard({
  showValues,
}: {
  showValues: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [report, setReport] = useState<InvestmentRealizedResultReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void investmentService
      .getRealizedResultReport(currentYear)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível apurar as vendas',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  async function changeYear(selectedYear: number) {
    setYear(selectedYear);
    setLoading(true);
    setError('');
    try {
      const response = await investmentService.getRealizedResultReport(selectedYear);
      setReport(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível apurar as vendas',
      );
    } finally {
      setLoading(false);
    }
  }

  const years = Array.from({ length: 6 }, (_, index) => currentYear - index);

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Resultado realizado
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Vendas agrupadas por mês e classe fiscal. Valorização de mercado não entra neste cálculo.
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
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Apurando vendas...</p>
      ) : error ? (
        <p className="mt-4 rounded-[12px] border border-[var(--expense)]/30 p-3 text-sm text-[var(--expense)]">{error}</p>
      ) : !report || report.saleCount === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Nenhuma venda fiscal em {year}.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {report.pending.length > 0 && (
            <div className="rounded-[14px] bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
              <strong className="block text-sm">{report.pending.length} pendência(s) na apuração</strong>
              <span className="mt-1 block">{report.pending[0]?.message}</span>
            </div>
          )}

          {report.monthlyGroups.map((group) => (
            <details
              key={[group.month, group.assetType, group.currency].join(':')}
              className="rounded-[14px] border border-[var(--border)]"
            >
              <summary className="cursor-pointer list-none p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <strong className="capitalize text-sm text-[var(--foreground)]">
                      {monthLabel.format(new Date(Date.UTC(year, group.month - 1, 1)))} · {group.assetType}
                    </strong>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      {group.saleCount} venda(s) · {group.currency}
                      {group.status === 'PENDING' ? ' · pendente' : ''}
                    </span>
                  </div>
                  <strong className={group.realizedResultCents < 0 ? 'text-[var(--expense)]' : 'text-[var(--income)]'}>
                    {group.status === 'PENDING'
                      ? 'Pendente'
                      : showValues
                        ? formatCurrency(group.realizedResultCents, group.currency)
                        : '••••'}
                  </strong>
                </div>
              </summary>
              <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
                <div className="grid gap-2 text-xs sm:grid-cols-3">
                  <Metric label="Venda líquida" value={showValues ? formatCurrency(group.netProceedsCents, group.currency) : '••••'} />
                  <Metric label="Custo das unidades" value={showValues ? formatCurrency(group.allocatedCostCents, group.currency) : '••••'} />
                  <Metric label="Taxas" value={showValues ? formatCurrency(group.feesCents, group.currency) : '••••'} />
                </div>
                <div className="mt-3 space-y-2">
                  {group.sales.map((sale) => (
                    <div key={sale.eventId} className="rounded-xl bg-[var(--surface-raised)] p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong>{sale.symbol} · {sale.quantity} un.</strong>
                        <span>{String(sale.day).padStart(2, '0')}/{String(sale.month).padStart(2, '0')}/{sale.year}</span>
                      </div>
                      <div className="mt-1 text-[var(--text-muted)]">
                        Líquido {showValues ? formatCurrency(sale.netProceedsCents, sale.currency) : '••••'} · custo {showValues ? formatCurrency(sale.allocatedCostCents, sale.currency) : '••••'}
                      </div>
                      {sale.pending[0] && <div className="mt-1 text-amber-400">{sale.pending[0]}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl bg-[var(--surface-raised)] p-3">
      <span className="block text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-[var(--foreground)]">{value}</strong>
    </span>
  );
}
