'use client';

import { useEffect, useState } from 'react';

import { investmentService } from '@/app/services/investment-service';
import type {
  InvestmentFiscalPendingCenter,
  InvestmentFiscalPendingItem,
} from '@/app/types/investment';

const categoryLabels: Record<InvestmentFiscalPendingItem['category'], string> = {
  FISCAL_COST: 'Custo fiscal',
  YEAR_END_SNAPSHOT: 'Fechamento em 31/12',
  INCOME_CLASSIFICATION: 'Rendimentos',
  REALIZED_RESULT: 'Vendas',
  TAX_APURATION: 'Apuração de imposto',
  PAYROLL_RECONCILIATION: 'Folha x informe',
};

export function FiscalPendingCenterCard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [report, setReport] =
    useState<InvestmentFiscalPendingCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justifying, setJustifying] =
    useState<InvestmentFiscalPendingItem | null>(null);
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(selectedYear: number) {
    const response = await investmentService.getFiscalPendingCenter(selectedYear);
    setReport(response.data);
  }

  useEffect(() => {
    let cancelled = false;

    void investmentService
      .getFiscalPendingCenter(currentYear)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível carregar as pendências fiscais',
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
      await load(selectedYear);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar as pendências fiscais',
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveJustification(event: React.FormEvent) {
    event.preventDefault();
    if (!justifying) return;

    setSaving(true);
    setError('');
    try {
      await investmentService.justifyFiscalPending({
        year,
        fingerprint: justifying.fingerprint,
        justification,
      });
      setJustifying(null);
      setJustification('');
      await load(year);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível justificar a pendência',
      );
    } finally {
      setSaving(false);
    }
  }

  const years = Array.from({ length: 6 }, (_, index) => currentYear - index);

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Pendências fiscais
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Centraliza lacunas que impedem considerar o ano fiscal completo.
          </p>
        </div>
        <select
          value={year}
          onChange={(event) => void changeYear(Number(event.target.value))}
          className="ds-control min-h-10 px-3 text-sm"
          disabled={loading}
          aria-label="Ano das pendências fiscais"
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-4 rounded-[12px] border border-[var(--expense)]/30 p-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Recalculando...</p>
      ) : !report ? null : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryMetric
              label="Status"
              value={
                report.status === 'COMPLETE'
                  ? 'Completo'
                  : report.status === 'COMPLETE_WITH_JUSTIFICATIONS'
                    ? 'Completo com justificativas'
                    : 'Incompleto'
              }
            />
            <SummaryMetric
              label="Pendências ativas"
              value={String(report.summary.active)}
            />
            <SummaryMetric
              label="Justificadas"
              value={String(report.summary.justified)}
            />
          </div>

          {report.items.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Nenhuma pendência fiscal identificada em {year}.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {report.items.map((item) => (
                <div
                  key={item.fingerprint}
                  className="rounded-[14px] border border-[var(--border)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-[var(--foreground)]">
                          {item.title}
                        </strong>
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
                          {categoryLabels[item.category]}
                        </span>
                        <span
                          className={
                            'rounded-full border px-2 py-0.5 text-[11px] font-bold ' +
                            (item.status === 'JUSTIFIED'
                              ? 'border-[var(--income)]/35 text-[var(--income)]'
                              : 'border-amber-500/35 text-amber-400')
                          }
                        >
                          {item.status === 'JUSTIFIED'
                            ? 'Justificada'
                            : item.severity === 'CRITICAL'
                              ? 'Crítica'
                              : 'Revisar'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                        {item.message}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]">
                        {item.suggestedAction}
                      </p>
                      {item.resolution && (
                        <p className="mt-2 rounded-xl bg-[var(--surface-raised)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
                          Justificativa: {item.resolution.justification}
                        </p>
                      )}
                    </div>

                    {item.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => {
                          setJustifying(item);
                          setJustification('');
                        }}
                        className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold"
                      >
                        Justificar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {report.resolutionHistory.some((item) => !item.applied) && (
            <details className="mt-4 rounded-[14px] border border-[var(--border)]">
              <summary className="cursor-pointer p-3 text-xs font-bold text-[var(--foreground)]">
                Histórico de justificativas antigas
              </summary>
              <div className="space-y-2 border-t border-[var(--border)] p-3">
                {report.resolutionHistory
                  .filter((item) => !item.applied)
                  .map((item) => (
                    <p
                      key={item.id}
                      className="text-xs leading-relaxed text-[var(--text-muted)]"
                    >
                      {item.pendingKey}: {item.justification}
                    </p>
                  ))}
              </div>
            </details>
          )}
        </>
      )}

      {justifying && (
        <form
          onSubmit={saveJustification}
          className="mt-4 rounded-[14px] bg-[var(--surface-raised)] p-4"
        >
          <strong className="text-sm text-[var(--foreground)]">
            Justificar · {justifying.title}
          </strong>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            A justificativa não altera os dados de origem. Se os dados mudarem,
            a pendência será recalculada e poderá reaparecer.
          </p>
          <textarea
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            className="ds-control mt-3 min-h-24 w-full p-3 text-sm"
            minLength={5}
            maxLength={1000}
            required
            disabled={saving}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-10 rounded-full bg-[var(--foreground)] px-4 text-xs font-bold text-[var(--background)] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar justificativa'}
            </button>
            <button
              type="button"
              onClick={() => setJustifying(null)}
              className="min-h-10 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold"
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[var(--surface-raised)] p-4">
      <span className="text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </span>
      <strong className="mt-1 block text-base text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}
