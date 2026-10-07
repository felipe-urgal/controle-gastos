'use client';

import { useEffect, useState } from 'react';
import { FaRedo } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';

type Status = 'MATCHED' | 'MISMATCH' | 'INCOMPLETE' | 'UNSUPPORTED_COMPONENT';

type Source = {
  documentId: string;
  month: number;
  paymentType: string;
  amountCents: number | null;
  rubrics: Array<{
    code: string | null;
    description: string;
    earningsCents: number | null;
    deductionsCents: number | null;
  }>;
};

type Component = {
  key: string;
  label: string;
  status: Status;
  payrollCents: number | null;
  statementCents: number | null;
  differenceCents: number | null;
  reason: string | null;
  sources: Source[];
};

type Group = {
  employerName: string;
  employerCnpj: string;
  year: number;
  status: Status;
  statementIds: string[];
  documentCount: number;
  components: Component[];
};

type Report = {
  year: number;
  status: 'MATCHED' | 'REVIEW_REQUIRED';
  summary: {
    groups: number;
    matchedGroups: number;
    reviewGroups: number;
    matchedComponents: number;
    reviewComponents: number;
  };
  items: Group[];
};

function money(value: number | null) {
  return value === null ? 'Não informado' : formatCurrency(value, 'BRL');
}

function statusLabel(status: Status) {
  if (status === 'MATCHED') return 'Conciliado';
  if (status === 'MISMATCH') return 'Divergente';
  if (status === 'INCOMPLETE') return 'Incompleto';
  return 'Não suportado';
}

function statusClass(status: Status) {
  if (status === 'MATCHED') {
    return 'bg-[var(--success-subtle)] text-[var(--success)]';
  }
  if (status === 'MISMATCH') {
    return 'bg-[var(--danger-subtle)] text-[var(--expense)]';
  }
  return 'bg-[var(--warning-subtle)] text-[var(--warning)]';
}

async function envelope<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message ?? 'Não foi possível concluir a operação');
  }
  return body.data as T;
}

export function PayrollAnnualReconciliationSection({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const lastClosedYear = new Date().getFullYear() - 1;
  const [year, setYear] = useState(lastClosedYear);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        '/api/payroll/annual/reconciliation?year=' + year,
        { cache: 'no-store' },
      );
      setReport(await envelope<Report>(response));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar a conciliação anual.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch('/api/payroll/annual/reconciliation?year=' + year, {
      cache: 'no-store',
    })
      .then((response) => envelope<Report>(response))
      .then((data) => {
        if (!cancelled) {
          setError('');
          setReport(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Não foi possível carregar a conciliação anual.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, year]);

  const years = Array.from({ length: 6 }, (_, index) => lastClosedYear - index);

  return (
    <section className="ds-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Conciliação anual
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Compara os documentos mensais com o informe anual sem corrigir diferenças automaticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={year}
            disabled={loading}
            onChange={(event) => {
              const selectedYear = Number(event.target.value);
              setYear(selectedYear);
            }}
            className="ds-control min-h-10 px-3 text-sm"
            aria-label="Ano da conciliação"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
          >
            <FaRedo aria-hidden="true" />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Conciliando documentos...</p>
      ) : !report || report.items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhum holerite ou informe anual encontrado para {year}.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Metric label="Fontes pagadoras" value={String(report.summary.groups)} />
            <Metric label="Conciliadas" value={String(report.summary.matchedGroups)} />
            <Metric label="Para revisar" value={String(report.summary.reviewGroups)} />
            <Metric label="Itens pendentes" value={String(report.summary.reviewComponents)} />
          </div>

          <div className="mt-4 space-y-3">
            {report.items.map((group) => (
              <article
                key={group.employerCnpj}
                className="rounded-[14px] border border-[var(--border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <strong className="text-sm text-[var(--foreground)]">
                      {group.employerName}
                    </strong>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {group.employerCnpj} · {group.documentCount} documento(s) mensal(is)
                    </p>
                  </div>
                  <span
                    className={
                      'rounded-full px-2 py-1 text-xs font-semibold ' +
                      statusClass(group.status)
                    }
                  >
                    {statusLabel(group.status)}
                  </span>
                </div>

                <div className="mt-3 divide-y divide-[var(--border)] rounded-[12px] border border-[var(--border)]">
                  {group.components.map((component) => (
                    <div key={component.key} className="p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <strong className="text-xs text-[var(--foreground)]">
                            {component.label}
                          </strong>
                          {component.reason && (
                            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
                              {component.reason}
                            </p>
                          )}
                        </div>
                        <span
                          className={
                            'rounded-full px-2 py-1 text-[11px] font-semibold ' +
                            statusClass(component.status)
                          }
                        >
                          {statusLabel(component.status)}
                        </span>
                      </div>

                      {component.key !== 'MONTHLY_COVERAGE' && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <Metric label="Holerites" value={money(component.payrollCents)} />
                          <Metric label="Informe" value={money(component.statementCents)} />
                          <Metric
                            label="Diferença"
                            value={
                              component.differenceCents === null
                                ? 'Não calculada'
                                : money(component.differenceCents)
                            }
                          />
                        </div>
                      )}

                      {component.sources.length > 0 && (
                        <details className="mt-3 rounded-[10px] bg-[var(--surface-raised)] p-3">
                          <summary className="cursor-pointer text-xs font-bold text-[var(--foreground)]">
                            Ver origem mensal
                          </summary>
                          <div className="mt-2 space-y-2">
                            {component.sources.map((source) => (
                              <div
                                key={source.documentId}
                                className="rounded-[10px] border border-[var(--border)] p-2 text-xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-[var(--foreground)]">
                                    {String(source.month).padStart(2, '0')}/{year} · {source.paymentType}
                                  </span>
                                  <span className="text-[var(--text-muted)]">
                                    {money(source.amountCents)}
                                  </span>
                                </div>
                                {source.rubrics.length > 0 && (
                                  <div className="mt-2 space-y-1 text-[11px] text-[var(--text-muted)]">
                                    {source.rubrics.map((rubric, index) => (
                                      <p key={(rubric.code ?? 'rubric') + ':' + index}>
                                        {rubric.code ? rubric.code + ' · ' : ''}
                                        {rubric.description}
                                        {' · '}
                                        {money(rubric.earningsCents ?? rubric.deductionsCents)}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-sm text-[var(--foreground)]">{value}</strong>
    </div>
  );
}
