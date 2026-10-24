'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaLink, FaRedo, FaUnlink } from 'react-icons/fa';

import { Button, Select } from '@/app/components/ui';
import { usePayrollConfirmation } from '@/app/components/pages/payroll/use-payroll-confirmation';

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
  const { confirm, modal: confirmationModal } = usePayrollConfirmation();
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

  function resolve(item: PayrollAdvanceResolutionItem) {
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
    confirm({
      title: 'Confirmar vínculo do adiantamento',
      message: warning,
      onConfirm: () => runResolve(item, candidate),
    });
  }

  async function runResolve(
    item: PayrollAdvanceResolutionItem,
    candidate: PayrollAdvanceResolutionItem['candidates'][number],
  ) {
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

  function undo(item: PayrollAdvanceResolutionItem) {
    confirm({
      title: 'Desfazer vínculo',
      message:
        'Desfazer a decisão manual? A conciliação automática será recalculada.',
      confirmText: 'Desfazer',
      onConfirm: () => runUndo(item),
    });
  }

  async function runUndo(item: PayrollAdvanceResolutionItem) {
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
        <Button
          variant="outline"
          pill
          onClick={() => void retry()}
          disabled={loading}
          icon={<FaRedo aria-hidden="true" />}
        >
          Atualizar
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" pill onClick={() => void retry()}>
            Tentar novamente
          </Button>
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
              className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4"
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
                    <p className="rounded-[var(--radius-md)] bg-[var(--warning-subtle)] p-3 text-xs text-[var(--warning)]">
                      Nenhuma rubrica de adiantamento foi encontrada em uma
                      folha REGULAR ativa desta competência.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                      <Select
                        label="Rubrica de compensação"
                        value={selected[item.advanceDocumentId] ?? ''}
                        onChange={(value) =>
                          setSelected((current) => ({
                            ...current,
                            [item.advanceDocumentId]: String(value),
                          }))
                        }
                        placeholder="Selecione explicitamente"
                        options={item.candidates.map((candidate) => ({
                          value: candidateKey(candidate),
                          label: `${candidate.description} · ${payrollMoney(
                            candidate.compensationCents,
                            showValues,
                          )}${
                            candidate.exactAmount
                              ? ' · valor exato'
                              : ' · valor divergente'
                          }`,
                        }))}
                      />
                      <Button
                        pill
                        disabled={
                          !selected[item.advanceDocumentId] ||
                          workingKey === item.advanceDocumentId
                        }
                        onClick={() => resolve(item)}
                        icon={<FaLink aria-hidden="true" />}
                      >
                        Confirmar vínculo
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--success-subtle)] p-3">
                  <p className="text-xs text-[var(--foreground)]">
                    Compensação confirmada:{' '}
                    <strong>
                      {payrollMoney(item.compensationCents, showValues)}
                    </strong>
                  </p>
                  <Button
                    variant="outline"
                    pill
                    disabled={workingKey === item.advanceDocumentId}
                    onClick={() => undo(item)}
                    icon={<FaUnlink aria-hidden="true" />}
                  >
                    Desfazer vínculo
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {confirmationModal}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-sm text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}
