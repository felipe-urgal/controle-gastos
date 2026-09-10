'use client';

import { useEffect, useState } from 'react';

import { NewPage } from '@/app/components/base-pages';
import { TransactionForm } from '@/app/components/pages/transactions';
import TransferForm from '@/app/components/pages/transactions/transfer-form';
import { FormData } from '@/app/lib/interface/transaction.interface';
import { getDuplicateTransactionValues } from '@/app/lib/transactions/transaction-quick-actions';
import { transactionService } from '@/app/services/transaction-service';

interface NewProps {
  duplicateId?: string;
}

type ComposeMode = 'transaction' | 'transfer';

export default function New({ duplicateId }: NewProps) {
  const [initialValues, setInitialValues] = useState<FormData>();
  const [loadingDuplicate, setLoadingDuplicate] = useState(Boolean(duplicateId));
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<ComposeMode>('transaction');
  const isDuplicating = Boolean(duplicateId);
  const isTransfer = !isDuplicating && composeMode === 'transfer';

  useEffect(() => {
    if (!duplicateId) return;

    const sourceId = duplicateId;
    let cancelled = false;

    async function loadDuplicateSource() {
      setLoadingDuplicate(true);
      setDuplicateError(null);

      try {
        const response = await transactionService.getById(sourceId);

        if (!cancelled) {
          setInitialValues(getDuplicateTransactionValues(response.data));
        }
      } catch (error) {
        if (!cancelled) {
          setDuplicateError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar a transação para duplicação',
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDuplicate(false);
        }
      }
    }

    loadDuplicateSource();

    return () => {
      cancelled = true;
    };
  }, [duplicateId]);

  return (
    <NewPage
      backUrl="/transacoes"
      title={isDuplicating ? 'Duplicar transação' : isTransfer ? 'Nova transferência' : 'Nova transação'}
      description={
        isDuplicating
          ? 'Revise os dados copiados e confirme somente quando o novo lançamento estiver correto.'
          : isTransfer
            ? 'Mova saldo entre contas próprias sem criar receita ou despesa operacional.'
            : 'Crie sua transação em poucos segundos.'
      }
    >
      {!isDuplicating && !loadingDuplicate && !duplicateError && (
        <div
          className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 [--focus:var(--orbit-focus)]"
          aria-label="Modo de criação"
        >
          <button
            type="button"
            aria-pressed={composeMode === 'transaction'}
            onClick={() => setComposeMode('transaction')}
            className={`min-h-11 rounded-[11px] border px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)] ${
              composeMode === 'transaction'
                ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
            }`}
          >
            Receita / Despesa
          </button>
          <button
            type="button"
            aria-pressed={composeMode === 'transfer'}
            onClick={() => setComposeMode('transfer')}
            className={`min-h-11 rounded-[11px] border px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)] ${
              composeMode === 'transfer'
                ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
            }`}
          >
            Transferência
          </button>
        </div>
      )}

      {loadingDuplicate ? (
        <div
          role="status"
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-muted)]"
        >
          Carregando dados da transação...
        </div>
      ) : duplicateError ? (
        <div
          role="alert"
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--danger)]/35 bg-[var(--danger-subtle)] p-4 text-sm font-medium text-[var(--expense)]"
        >
          {duplicateError}
        </div>
      ) : isTransfer ? (
        <TransferForm />
      ) : (
        <TransactionForm isEditing={false} initialValues={initialValues} />
      )}
    </NewPage>
  );
}
