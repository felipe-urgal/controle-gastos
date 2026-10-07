'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaLink, FaRedo, FaUnlink } from 'react-icons/fa';

import { useAuth } from '@/app/context/auth-context';
import { payrollMoney } from '@/app/lib/payroll/payroll-presentation';
import { payrollService } from '@/app/services/payroll-service';
import type {
  PayrollAdvanceCandidate,
  PayrollAdvanceResolutionItem,
} from '@/app/types/payroll';

function candidateKey(candidate: PayrollAdvanceCandidate) {
  return candidate.regularDocumentId + ':' + candidate.rubricIndex;
}

export function PayrollAdvanceReconciliationSection({
  refreshKey,
  onChanged,
}: {
  refreshKey: string;
  onChanged?: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [items, setItems] = useState<PayrollAdvanceResolutionItem[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await payrollService.advanceResolution());
  }, []);

  useEffect(() => {
    let cancelled = false;

    payrollService
      .advanceResolution()
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

  async function retry() {
    setLoading(true);
    setError('');
    try {
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar os adiantamentos para revisão',
      );
    } finally {
      setLoading(false);
    }
  }

  async function resolve(item: PayrollAdvanceResolutionItem) {
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
      await payrollService.resolveAdvance({
        advanceDocumentId: item.advanceDocumentId,
        regularDocumentId: candidate.regularDocumentId,
        rubricIndex: candidate.rubricIndex,
        confirmed: true,
      });
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

  async function undo(item: PayrollAdvanceResolutionItem) {
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
      await payrollService.undoAdvance(item.advanceDocumentId);
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
    <section className="ds-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Adiantamentos para revisar
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Escolha explicitamente a folha e a rubrica quando a compensação
            automática for ambígua.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void retry()}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
        >
          <FaRedo aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void retry()}
            className="min-h-11 rounded-full border border-current px-3 text-xs font-bold"
          >
            Tentar novamente
          </button>
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
                    {String(item.month).padStart(2, '0')}/{item.year} ·{' '}
                    {item.employerCnpj}
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
                <Metric
                  label="Adiantamento esperado"
                  value={payrollMoney(item.expectedAdvanceCents, showValues)}
                />
                <Metric
                  label="Líquido pago"
                  value={payrollMoney(item.netPaidCents, showValues)}
                />
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
                      Nenhuma rubrica de adiantamento foi encontrada em uma
                      folha REGULAR ativa desta competência.
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
                              {candidate.description} ·{' '}
                              {payrollMoney(
                                candidate.compensationCents,
                                showValues,
                              )}
                              {candidate.exactAmount
                                ? ' · valor exato'
                                : ' · valor divergente'}
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
                    Compensação confirmada:{' '}
                    <strong>
                      {payrollMoney(item.compensationCents, showValues)}
                    </strong>
                  </p>
                  <button
                    type="button"
                    disabled={workingKey === item.advanceDocumentId}
                    onClick={() => void undo(item)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold disabled:opacity-40"
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-sm text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}
