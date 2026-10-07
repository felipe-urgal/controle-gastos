'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaLink, FaUnlink } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';

type Candidate = {
  regularDocumentId: string;
  rubricIndex: number;
  description: string;
  compensationCents: number;
  differenceCents: number | null;
  exactAmount: boolean;
  importedAt: string;
};

type AdvanceResolutionItem = {
  linkId: string;
  advanceDocumentId: string;
  employerName: string;
  employerCnpj: string;
  year: number;
  month: number;
  expectedAdvanceCents: number | null;
  netPaidCents: number | null;
  status: 'PENDING' | 'MATCHED';
  reason: string | null;
  decisionSource: 'MANUAL' | 'AUTOMATIC';
  selectedRegularDocumentId: string | null;
  selectedRubricIndex: number | null;
  compensationCents: number | null;
  resolvedAt: string | null;
  candidates: Candidate[];
};

async function readEnvelope<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(
      body.error?.message ?? 'Não foi possível concluir a operação',
    );
  }
  return body.data as T;
}

function money(value: number | null) {
  return value === null ? 'Não informado' : formatCurrency(value, 'BRL');
}

function candidateKey(candidate: Candidate) {
  return candidate.regularDocumentId + ':' + candidate.rubricIndex;
}

export function PayrollAdvanceReconciliationSection({
  refreshKey,
  onChanged,
}: {
  refreshKey: string;
  onChanged?: () => void | Promise<void>;
}) {
  const [items, setItems] = useState<AdvanceResolutionItem[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/payroll/advance-reconciliation', {
      cache: 'no-store',
    });
    setItems(await readEnvelope<AdvanceResolutionItem[]>(response));
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/payroll/advance-reconciliation', { cache: 'no-store' })
      .then((response) => readEnvelope<AdvanceResolutionItem[]>(response))
      .then((data) => {
        if (!cancelled) {
          setError('');
          setItems(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível carregar os adiantamentos para revisão',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function resolve(item: AdvanceResolutionItem) {
    const key = selected[item.advanceDocumentId];
    const candidate = item.candidates.find(
      (current) => candidateKey(current) === key,
    );
    if (!candidate) return;

    const warning =
      item.candidates.length > 1
        ? 'Há mais de uma rubrica candidata. Confirmar explicitamente esta compensação?'
        : candidate.exactAmount
          ? 'Confirmar este vínculo de adiantamento com a folha?'
          : 'O valor da rubrica diverge do valor esperado do adiantamento. Confirmar mesmo assim?';
    if (!window.confirm(warning)) return;

    setWorkingKey(item.advanceDocumentId);
    setError('');
    try {
      const response = await fetch('/api/payroll/advance-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advanceDocumentId: item.advanceDocumentId,
          regularDocumentId: candidate.regularDocumentId,
          rubricIndex: candidate.rubricIndex,
          confirmed: true,
        }),
      });
      await readEnvelope(response);
      setSelected((current) => {
        const next = { ...current };
        delete next[item.advanceDocumentId];
        return next;
      });
      await load();
      await onChanged?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível confirmar o vínculo',
      );
    } finally {
      setWorkingKey('');
    }
  }

  async function undo(item: AdvanceResolutionItem) {
    if (
      !window.confirm(
        'Desfazer a decisão manual? A conciliação automática será recalculada.',
      )
    ) {
      return;
    }

    setWorkingKey(item.advanceDocumentId);
    setError('');
    try {
      const response = await fetch(
        '/api/payroll/advance-reconciliation/' + item.advanceDocumentId,
        { method: 'DELETE' },
      );
      await readEnvelope(response);
      await load();
      await onChanged?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível desfazer a decisão manual',
      );
    } finally {
      setWorkingKey('');
    }
  }

  return (
    <section className="ds-panel p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Adiantamentos para revisar
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Escolha explicitamente a folha e a rubrica quando a compensação automática for ambígua.
        </p>
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
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Carregando adiantamentos...
        </p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhum adiantamento pendente de decisão manual.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article
              key={item.advanceDocumentId}
              className="rounded-[14px] border border-[var(--border)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="text-sm text-[var(--foreground)]">
                    {item.employerName}
                  </strong>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {String(item.month).padStart(2, '0')}/{item.year} · {item.employerCnpj}
                  </p>
                </div>
                <span
                  className={
                    item.status === 'MATCHED'
                      ? 'rounded-full bg-[var(--success-subtle)] px-2 py-1 text-xs font-semibold text-[var(--success)]'
                      : 'rounded-full bg-[var(--warning-subtle)] px-2 py-1 text-xs font-semibold text-[var(--warning)]'
                  }
                >
                  {item.status === 'MATCHED'
                    ? 'Resolvido manualmente'
                    : 'Revisão necessária'}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
                  <span className="block text-xs text-[var(--text-muted)]">
                    Adiantamento esperado
                  </span>
                  <strong className="mt-1 block text-sm text-[var(--foreground)]">
                    {money(item.expectedAdvanceCents)}
                  </strong>
                </div>
                <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
                  <span className="block text-xs text-[var(--text-muted)]">
                    Líquido pago
                  </span>
                  <strong className="mt-1 block text-sm text-[var(--foreground)]">
                    {money(item.netPaidCents)}
                  </strong>
                </div>
              </div>

              {item.status === 'PENDING' ? (
                <div className="mt-3">
                  {item.reason && (
                    <p className="mb-3 text-xs leading-relaxed text-[var(--text-muted)]">
                      {item.reason}
                    </p>
                  )}

                  {item.candidates.length === 0 ? (
                    <p className="rounded-[12px] bg-[var(--warning-subtle)] p-3 text-xs text-[var(--warning)]">
                      Nenhuma rubrica de adiantamento foi encontrada em uma folha REGULAR ativa desta competência.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Rubrica de compensação
                        <select
                          value={selected[item.advanceDocumentId] ?? ''}
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
                              [item.advanceDocumentId]: event.target.value,
                            }))
                          }
                          className="ds-control mt-1 min-h-11 w-full px-3"
                        >
                          <option value="">Selecione explicitamente</option>
                          {item.candidates.map((candidate) => (
                            <option
                              key={candidateKey(candidate)}
                              value={candidateKey(candidate)}
                            >
                              {candidate.description} · {money(candidate.compensationCents)}
                              {candidate.exactAmount ? ' · valor exato' : ' · valor divergente'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={
                          !selected[item.advanceDocumentId] ||
                          workingKey === item.advanceDocumentId
                        }
                        onClick={() => void resolve(item)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--orbit-primary)] px-4 text-xs font-bold text-white disabled:opacity-40"
                      >
                        <FaLink aria-hidden="true" />
                        Confirmar vínculo
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-[var(--success-subtle)] p-3">
                  <p className="text-xs text-[var(--foreground)]">
                    Compensação confirmada: <strong>{money(item.compensationCents)}</strong>
                  </p>
                  <button
                    type="button"
                    disabled={workingKey === item.advanceDocumentId}
                    onClick={() => void undo(item)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold disabled:opacity-40"
                  >
                    <FaUnlink aria-hidden="true" />
                    Desfazer vínculo
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
