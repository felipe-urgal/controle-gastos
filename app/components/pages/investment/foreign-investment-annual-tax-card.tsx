'use client';

import { useEffect, useState } from 'react';
import { FaSyncAlt } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { investmentService } from '@/app/services/investment-service';
import type { ForeignInvestmentAnnualTaxReport } from '@/app/types/investment';

function money(value: number | null, showValues: boolean) {
  if (!showValues) return '••••';
  if (value === null) return 'Pendente';
  return formatCurrency(value, 'BRL');
}

export function ForeignInvestmentAnnualTaxCard({
  showValues,
}: {
  showValues: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const initialYear = Math.max(2024, currentYear);
  const [year, setYear] = useState(initialYear);
  const [report, setReport] =
    useState<ForeignInvestmentAnnualTaxReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load(selectedYear: number) {
    const response =
      await investmentService.getForeignAnnualTaxReport(selectedYear);
    setReport(response.data);
  }

  useEffect(() => {
    let cancelled = false;
    void investmentService
      .getForeignAnnualTaxReport(initialYear)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível apurar os investimentos no exterior',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialYear]);

  async function changeYear(selectedYear: number) {
    setYear(selectedYear);
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await load(selectedYear);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível apurar os investimentos no exterior',
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshPtax() {
    setRefreshing(true);
    setError('');
    setNotice('');
    try {
      const response =
        await investmentService.refreshForeignInvestmentPtax(year);
      const result = response.data;
      setNotice(
        `${result.fetched} PTAX buscada(s), ${result.reused} já disponível(is)` +
          (result.failed.length > 0
            ? ` e ${result.failed.length} falha(s).`
            : '.'),
      );
      await load(year);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível atualizar a PTAX',
      );
    } finally {
      setRefreshing(false);
    }
  }

  const years = Array.from(
    { length: Math.max(1, currentYear - 2024 + 1) },
    (_, index) => currentYear - index,
  ).filter((item) => item >= 2024);

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Investimentos no exterior
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Apuração anual em reais · Lei 14.754/2023 · alíquota de 15%.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={year}
            onChange={(event) => void changeYear(Number(event.target.value))}
            className="ds-control min-h-10 px-3 text-sm"
            disabled={loading || refreshing}
            aria-label="Ano da apuração de investimentos no exterior"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void refreshPtax()}
            disabled={loading || refreshing}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-50"
          >
            <FaSyncAlt
              aria-hidden="true"
              className={refreshing ? 'animate-spin' : undefined}
            />
            {refreshing ? 'Atualizando...' : 'Atualizar PTAX'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-[12px] border border-[var(--expense)]/30 p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-muted)]">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Apurando...</p>
      ) : !report ? null : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Resultado de vendas"
              value={money(report.summary.saleResultCents, showValues)}
            />
            <Metric
              label="Rendimentos"
              value={money(report.summary.incomeCents, showValues)}
            />
            <Metric
              label="Base após perdas"
              value={money(report.summary.taxableBaseCents, showValues)}
            />
            <Metric
              label="IRPF estimado · 15%"
              value={money(report.summary.taxDueCents, showValues)}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Metric
              label="Perda trazida"
              value={money(report.summary.openingLossCents, showValues)}
            />
            <Metric
              label="Perda compensada"
              value={money(report.summary.compensatedLossCents, showValues)}
            />
            <Metric
              label="Perda para anos seguintes"
              value={money(report.summary.closingLossCents, showValues)}
            />
          </div>

          {report.status === 'PENDING' && (
            <div className="mt-4 rounded-[14px] bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
              <strong className="block text-sm">Apuração pendente</strong>
              <span className="mt-1 block">
                O imposto não é fechado enquanto houver PTAX, classificação ou
                custo fiscal sem base auditável.
              </span>
            </div>
          )}

          {report.pending.length > 0 && (
            <div className="mt-4 space-y-2">
              {report.pending.map((item, index) => (
                <div
                  key={[
                    item.code,
                    item.year,
                    item.eventId ?? item.assetId ?? index,
                  ].join(':')}
                  className="rounded-[12px] border border-[var(--border)] p-3 text-xs"
                >
                  <strong className="text-[var(--foreground)]">
                    {item.symbol ?? `Ano ${item.year}`} · {item.code}
                  </strong>
                  <span className="mt-1 block text-[var(--text-muted)]">
                    {item.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {report.annualRows.length > 0 && (
            <details className="mt-4 rounded-[14px] border border-[var(--border)] p-3">
              <summary className="cursor-pointer text-sm font-bold text-[var(--foreground)]">
                Histórico da compensação de perdas
              </summary>
              <div className="mt-3 space-y-2">
                {report.annualRows.map((row) => (
                  <div
                    key={row.year}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--surface-raised)] p-3 text-xs"
                  >
                    <strong className="text-[var(--foreground)]">
                      {row.year} · {row.status === 'OK' ? 'Fechado' : 'Pendente'}
                    </strong>
                    <span className="text-[var(--text-muted)]">
                      Base: {money(row.taxableBaseCents, showValues)} · Imposto:{' '}
                      {money(row.taxDueCents, showValues)} · Perda final:{' '}
                      {money(row.closingLossCents, showValues)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-subtle)]">
            Compras usam PTAX de compra para formar custo em reais; vendas,
            resgates e rendimentos usam a conversão aplicável ao fato gerador.
            Crédito de imposto pago no exterior não está incluído nesta etapa.
          </p>
        </>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[var(--surface-raised)] p-4">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <strong className="mt-1 block text-sm text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}
