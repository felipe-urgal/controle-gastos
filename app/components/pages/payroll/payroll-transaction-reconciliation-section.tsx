'use client';

import { useEffect, useState } from 'react';
import { FaLink, FaUnlink } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';

type CandidateTransaction = {
  id: string;
  amountCents: number;
  type: string;
  status: string;
  description: string;
  date: string;
  reconciliationStatus: string;
  account: {
    id: string;
    name: string;
    currency: string;
  };
};

type PayrollTransactionReconciliationItem = {
  documentId: string;
  documentType: 'PAYROLL_ADVANCE' | 'MONTHLY_PAYSLIP';
  paymentType: 'ADVANCE' | 'REGULAR';
  employerName: string;
  employerCnpj: string;
  year: number;
  month: number;
  netPaidCents: number | null;
  status: 'MATCHED' | 'SUGGESTED' | 'UNMATCHED' | 'REVIEW_REQUIRED';
  reason: string | null;
  matchedTransaction: CandidateTransaction | null;
  candidates: CandidateTransaction[];
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

function statusLabel(status: PayrollTransactionReconciliationItem['status']) {
  if (status === 'MATCHED') return 'Vinculado';
  if (status === 'SUGGESTED') return '1 candidato';
  if (status === 'UNMATCHED') return 'Sem crédito';
  return 'Revisar';
}

function statusClass(status: PayrollTransactionReconciliationItem['status']) {
  if (status === 'MATCHED') {
    return 'bg-[var(--success-subtle)] text-[var(--success)]';
  }
  if (status === 'SUGGESTED') {
    return 'bg-[var(--surface-subtle)] text-[var(--foreground)]';
  }
  return 'bg-[var(--warning-subtle)] text-[var(--warning)]';
}

function typeLabel(type: PayrollTransactionReconciliationItem['documentType']) {
  return type === 'PAYROLL_ADVANCE' ? 'Adiantamento' : 'Folha mensal';
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return [day, month, year].join('/');
}

export function PayrollTransactionReconciliationSection({
  refreshKey,
}: {
  refreshKey: string;
}) {
  const [items, setItems] = useState<PayrollTransactionReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/payroll/transaction-reconciliation', {
      cache: 'no-store',
    });
    setItems(
      await readEnvelope<PayrollTransactionReconciliationItem[]>(response),
    );
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetch('/api/payroll/transaction-reconciliation', { cache: 'no-store' })
      .then((response) =>
        readEnvelope<PayrollTransactionReconciliationItem[]>(response),
      )
      .then((data) => {
        if (!cancelled) setItems(data);
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
  }, [refreshKey]);

  async function link(documentId: string, transactionId: string) {
    const key = documentId + ':' + transactionId;
    setWorkingKey(key);
    setError('');
    try {
      const response = await fetch('/api/payroll/transaction-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollDocumentId: documentId,
          transactionId,
        }),
      });
      await readEnvelope(response);
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
      const response = await fetch(
        '/api/payroll/transaction-reconciliation/' + documentId,
        { method: 'DELETE' },
      );
      await readEnvelope(response);
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

  return (
    <section className="ds-panel p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Pagamentos x créditos bancários
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
          Vincule o líquido do holerite ao crédito que já existe na conta. Nenhuma
          receita nova é criada por esta conciliação.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Buscando créditos compatíveis...
        </p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Importe um holerite ou adiantamento para iniciar a conciliação bancária.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article
              key={item.documentId}
              className="rounded-[14px] border border-[var(--border)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-[var(--foreground)]">
                      {typeLabel(item.documentType)}
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
                      {statusLabel(item.status)}
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
                    {item.netPaidCents === null
                      ? 'Não informado'
                      : formatCurrency(item.netPaidCents, 'BRL')}
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
                  <TransactionSummary transaction={item.matchedTransaction} />
                  <button
                    type="button"
                    disabled={workingKey === item.documentId + ':unlink'}
                    onClick={() => void unlink(item.documentId)}
                    className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold disabled:opacity-40"
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
                        <TransactionSummary transaction={candidate} />
                        <button
                          type="button"
                          disabled={workingKey !== '' && workingKey !== key}
                          onClick={() => void link(item.documentId, candidate.id)}
                          className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-[var(--foreground)] px-3 text-xs font-bold text-[var(--background)] disabled:opacity-40"
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
    </section>
  );
}

function TransactionSummary({
  transaction,
}: {
  transaction: CandidateTransaction;
}) {
  return (
    <div className="grid gap-1 text-xs sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
      <strong className="text-[var(--foreground)]">
        {dateLabel(transaction.date)}
      </strong>
      <span className="min-w-0 truncate text-[var(--text-muted)]">
        {transaction.account.name} · {transaction.description}
      </span>
      <strong className="text-[var(--foreground)] sm:text-right">
        {formatCurrency(transaction.amountCents, transaction.account.currency)}
      </strong>
    </div>
  );
}
