'use client';

import { useEffect, useState } from 'react';
import { FaLink, FaUnlink } from 'react-icons/fa';

import { formatCurrency } from '@/app/lib/currency/format-currency';
import { investmentService } from '@/app/services/investment-service';
import type {
  InvestmentTaxPaymentReconciliationItem,
  InvestmentTaxPaymentTransactionCandidate,
} from '@/app/types/investment';

function statusLabel(status: InvestmentTaxPaymentReconciliationItem['status']) {
  if (status === 'MATCHED') return 'Vinculado';
  if (status === 'SUGGESTED') return '1 candidato';
  if (status === 'UNMATCHED') return 'Sem saída';
  return 'Revisar';
}

function statusClass(status: InvestmentTaxPaymentReconciliationItem['status']) {
  if (status === 'MATCHED') {
    return 'bg-[var(--success-subtle)] text-[var(--success)]';
  }
  if (status === 'SUGGESTED') {
    return 'bg-[var(--surface-subtle)] text-[var(--foreground)]';
  }
  return 'bg-[var(--warning-subtle)] text-[var(--warning)]';
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return [day, month, year].join('/');
}

export function InvestmentTaxPaymentReconciliationSection({
  year,
  showValues,
}: {
  year: number;
  showValues: boolean;
}) {
  const [items, setItems] = useState<InvestmentTaxPaymentReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await investmentService.getTaxPaymentReconciliation(year);
    setItems(response.data ?? []);
  }

  useEffect(() => {
    let cancelled = false;

    void investmentService
      .getTaxPaymentReconciliation(year)
      .then((response) => {
        if (!cancelled) setItems(response.data ?? []);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Não foi possível carregar a conciliação dos DARFs',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  async function link(paymentId: string, transactionId: string) {
    const key = paymentId + ':' + transactionId;
    setWorkingKey(key);
    setError('');
    try {
      await investmentService.linkTaxPaymentTransaction(paymentId, transactionId);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível vincular a saída bancária',
      );
    } finally {
      setWorkingKey('');
    }
  }

  async function unlink(paymentId: string) {
    const key = paymentId + ':unlink';
    setWorkingKey(key);
    setError('');
    try {
      await investmentService.unlinkTaxPaymentTransaction(paymentId);
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
    <section className="mt-5 border-t border-[var(--border)] pt-5">
      <div>
        <h3 className="text-sm font-bold text-[var(--foreground)]">
          DARFs x saídas bancárias
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
          Vincule o DARF à despesa que já existe na conta. Esta conciliação não cria nem altera lançamentos financeiros.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-[12px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Buscando saídas compatíveis...
        </p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Nenhum DARF registrado para {year}.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <article
              key={item.paymentId}
              className="rounded-[14px] border border-[var(--border)] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-xs text-[var(--foreground)]">
                      DARF {item.code}
                    </strong>
                    <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-1 text-[11px] text-[var(--text-muted)]">
                      {String(item.competenceMonth).padStart(2, '0')}/{item.competenceYear}
                    </span>
                    <span
                      className={
                        'rounded-full px-2 py-1 text-[11px] font-semibold ' +
                        statusClass(item.status)
                      }
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    Pago em {dateLabel(item.paidDate)} · {item.assetType} · {item.currency}
                  </p>
                  {item.receiptReference ? (
                    <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                      Comprovante: {item.receiptReference}
                    </p>
                  ) : null}
                </div>
                <strong className="text-sm text-[var(--foreground)]">
                  {showValues ? formatCurrency(item.amountCents, item.currency) : '••••'}
                </strong>
              </div>

              {item.reason ? (
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {item.reason}
                </p>
              ) : null}

              {item.matchedTransaction ? (
                <div className="mt-3 rounded-[12px] bg-[var(--surface-raised)] p-3">
                  <TransactionSummary
                    transaction={item.matchedTransaction}
                    showValues={showValues}
                  />
                  <button
                    type="button"
                    disabled={workingKey !== ''}
                    onClick={() => void unlink(item.paymentId)}
                    className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold disabled:opacity-40"
                  >
                    <FaUnlink aria-hidden="true" />
                    {workingKey === item.paymentId + ':unlink'
                      ? 'Desfazendo...'
                      : 'Desfazer vínculo'}
                  </button>
                </div>
              ) : item.candidates.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {item.candidates.map((candidate) => {
                    const key = item.paymentId + ':' + candidate.id;
                    return (
                      <div
                        key={candidate.id}
                        className="rounded-[12px] bg-[var(--surface-raised)] p-3"
                      >
                        <TransactionSummary
                          transaction={candidate}
                          showValues={showValues}
                        />
                        <button
                          type="button"
                          disabled={workingKey !== ''}
                          onClick={() => void link(item.paymentId, candidate.id)}
                          className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-[var(--foreground)] px-3 text-xs font-bold text-[var(--background)] disabled:opacity-40"
                        >
                          <FaLink aria-hidden="true" />
                          {workingKey === key ? 'Vinculando...' : 'Vincular'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function TransactionSummary({
  transaction,
  showValues,
}: {
  transaction: InvestmentTaxPaymentTransactionCandidate;
  showValues: boolean;
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
        {showValues
          ? formatCurrency(transaction.amountCents, transaction.account.currency)
          : '••••'}
      </strong>
    </div>
  );
}
