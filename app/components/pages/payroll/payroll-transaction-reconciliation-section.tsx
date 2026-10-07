'use client';

import { useEffect, useState } from 'react';
import { FaLink, FaRedo, FaUnlink } from 'react-icons/fa';

import { useAuth } from '@/app/context/auth-context';
import { logicalDateParts } from '@/app/lib/payroll/payroll-date';
import {
  payrollMoney,
  payrollPaymentTypeLabel,
  payrollReconciliationStatusLabel,
} from '@/app/lib/payroll/payroll-presentation';
import { payrollService } from '@/app/services/payroll-service';
import type {
  CandidateTransaction,
  PayrollPage,
  PayrollReconciliationStatus,
  PayrollTransactionReconciliationItem,
} from '@/app/types/payroll';

function statusClass(status: PayrollReconciliationStatus) {
  if (status === 'MATCHED') {
    return 'bg-[var(--success-subtle)] text-[var(--success)]';
  }
  if (status === 'SUGGESTED') {
    return 'bg-[var(--surface-subtle)] text-[var(--foreground)]';
  }
  return 'bg-[var(--warning-subtle)] text-[var(--warning)]';
}

function typeLabel(item: PayrollTransactionReconciliationItem) {
  return item.documentType === 'PAYROLL_ADVANCE'
    ? 'Adiantamento'
    : payrollPaymentTypeLabel(item.paymentType);
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return [day, month, year].join('/');
}

const statusOptions: Array<{
  value: '' | PayrollReconciliationStatus;
  label: string;
}> = [
  { value: '', label: 'Todos os status' },
  { value: 'MATCHED', label: 'Vinculado' },
  { value: 'SUGGESTED', label: '1 candidato' },
  { value: 'UNMATCHED', label: 'Sem crédito' },
  { value: 'REVIEW_REQUIRED', label: 'Revisar' },
];

export function PayrollTransactionReconciliationSection({
  refreshKey,
}: {
  refreshKey: string;
}) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const currentYear = logicalDateParts().year;
  const [year, setYear] = useState(currentYear);
  const [status, setStatus] = useState<'' | PayrollReconciliationStatus>('');
  const [employerDraft, setEmployerDraft] = useState('');
  const [employer, setEmployer] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<
    PayrollPage<PayrollTransactionReconciliationItem>
  >({
    items: [],
    pageInfo: { page: 1, limit: 12, hasMore: false },
  });
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const data = await payrollService.transactionReconciliation({
      year,
      status: status || undefined,
      employer: employer || undefined,
      page,
      limit: 12,
    });
    setResult(data);
  }

  useEffect(() => {
    let cancelled = false;

    payrollService
      .transactionReconciliation({
        year,
        status: status || undefined,
        employer: employer || undefined,
        page,
        limit: 12,
      })
      .then((data) => {
        if (!cancelled) {
          setError('');
          setResult(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível carregar a conciliação bancária',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employer, page, refreshKey, status, year]);

  function changeYear(nextYear: number) {
    setLoading(true);
    setPage(1);
    setYear(nextYear);
  }

  function changeStatus(nextStatus: '' | PayrollReconciliationStatus) {
    setLoading(true);
    setPage(1);
    setStatus(nextStatus);
  }

  function applyEmployerFilter() {
    setLoading(true);
    setPage(1);
    setEmployer(employerDraft.trim());
  }

  async function retry() {
    setLoading(true);
    setError('');
    try {
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar a conciliação bancária',
      );
    } finally {
      setLoading(false);
    }
  }

  async function link(documentId: string, transactionId: string) {
    const key = documentId + ':' + transactionId;
    setWorkingKey(key);
    setError('');
    try {
      await payrollService.linkTransaction({
        payrollDocumentId: documentId,
        transactionId,
      });
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível vincular o crédito',
      );
    } finally {
      setWorkingKey('');
    }
  }

  async function unlink(documentId: string) {
    setWorkingKey(documentId + ':unlink');
    setError('');
    try {
      await payrollService.unlinkTransaction(documentId);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível desfazer o vínculo',
      );
    } finally {
      setWorkingKey('');
    }
  }

  const years = Array.from({ length: 8 }, (_, index) => currentYear - index);

  return (
    <section className="ds-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Pagamentos x créditos bancários
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            O líquido do documento só pode ser ligado a crédito NORMAL,
            concluído, em conta corrente BRL. Metadados bancários do holerite
            servem apenas para ordenar e explicar candidatos.
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

      <div className="mt-4 grid gap-2 md:grid-cols-[120px_180px_minmax(0,1fr)_auto]">
        <label className="text-xs font-semibold text-[var(--foreground)]">
          Ano
          <select
            aria-label="Ano da conciliação bancária"
            value={year}
            onChange={(event) => changeYear(Number(event.target.value))}
            className="ds-control mt-1 min-h-11 w-full px-3"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-[var(--foreground)]">
          Status
          <select
            aria-label="Status da conciliação bancária"
            value={status}
            onChange={(event) =>
              changeStatus(
                event.target.value as '' | PayrollReconciliationStatus,
              )
            }
            className="ds-control mt-1 min-h-11 w-full px-3"
          >
            {statusOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-[var(--foreground)]">
          Fonte pagadora
          <input
            value={employerDraft}
            onChange={(event) => setEmployerDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyEmployerFilter();
            }}
            placeholder="Nome ou CNPJ"
            className="ds-control mt-1 min-h-11 w-full px-3"
          />
        </label>

        <button
          type="button"
          onClick={applyEmployerFilter}
          className="min-h-11 self-end rounded-full bg-[var(--foreground)] px-4 text-xs font-bold text-[var(--background)]"
        >
          Filtrar
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
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
          Buscando créditos compatíveis...
        </p>
      ) : result.items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Nenhum documento encontrado para os filtros selecionados.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {result.items.map((item) => (
            <article
              key={item.documentId}
              className="rounded-[14px] border border-[var(--border)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-[var(--foreground)]">
                      {typeLabel(item)}
                    </strong>
                    <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-xs text-[var(--text-muted)]">
                      {String(item.month).padStart(2, '0')}/{item.year}
                    </span>
                    <span
                      className={
                        'rounded-full px-2 py-1 text-xs font-semibold ' +
                        statusClass(item.status)
                      }
                    >
                      {payrollReconciliationStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.employerName} · {item.employerCnpj}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="block text-[11px] text-[var(--text-muted)]">
                    Líquido esperado
                  </span>
                  <strong className="text-sm text-[var(--foreground)]">
                    {payrollMoney(item.netPaidCents, showValues)}
                  </strong>
                </div>
              </div>

              {item.reason && (
                <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
                  {item.reason}
                </p>
              )}

              {item.matchedTransaction && (
                <div className="mt-3 rounded-[12px] bg-[var(--surface-raised)] p-3">
                  <TransactionSummary
                    transaction={item.matchedTransaction}
                    showValues={showValues}
                  />
                  <button
                    type="button"
                    disabled={workingKey === item.documentId + ':unlink'}
                    onClick={() => void unlink(item.documentId)}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold disabled:opacity-40"
                  >
                    <FaUnlink aria-hidden="true" />
                    {workingKey === item.documentId + ':unlink'
                      ? 'Desfazendo...'
                      : 'Desfazer vínculo'}
                  </button>
                </div>
              )}

              {!item.matchedTransaction && item.candidates.length > 0 && (
                <div className="mt-3 space-y-2">
                  {item.candidates.map((candidate) => {
                    const key = item.documentId + ':' + candidate.id;
                    return (
                      <div
                        key={candidate.id}
                        className="rounded-[12px] bg-[var(--surface-raised)] p-3"
                      >
                        <TransactionSummary
                          transaction={candidate}
                          showValues={showValues}
                        />
                        {candidate.evidence?.explanation && (
                          <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
                            {candidate.evidence.explanation}
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={workingKey !== ''}
                          onClick={() =>
                            void link(item.documentId, candidate.id)
                          }
                          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--foreground)] px-3 text-xs font-bold text-[var(--background)] disabled:opacity-40"
                        >
                          <FaLink aria-hidden="true" />
                          {workingKey === key ? 'Vinculando...' : 'Vincular'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {!loading && (page > 1 || result.pageInfo.hasMore) && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              setLoading(true);
              setPage((current) => Math.max(1, current - 1));
            }}
            className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            Página {page}
          </span>
          <button
            type="button"
            disabled={!result.pageInfo.hasMore}
            onClick={() => {
              setLoading(true);
              setPage((current) => current + 1);
            }}
            className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </section>
  );
}

function TransactionSummary({
  transaction,
  showValues,
}: {
  transaction: CandidateTransaction;
  showValues: boolean;
}) {
  return (
    <div className="grid gap-1 text-xs sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
      <strong className="text-[var(--foreground)]">
        {dateLabel(transaction.date)}
      </strong>
      <span className="min-w-0 break-words text-[var(--text-muted)]">
        {transaction.account.name} · {transaction.description}
      </span>
      <strong className="text-[var(--foreground)] sm:text-right">
        {payrollMoney(
          transaction.amountCents,
          showValues,
          transaction.account.currency,
        )}
      </strong>
    </div>
  );
}
