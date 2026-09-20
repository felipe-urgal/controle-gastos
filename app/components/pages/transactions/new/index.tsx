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
type CategoryType = 'INCOME' | 'EXPENSE';

export default function New({ duplicateId }: NewProps) {
  const [initialValues, setInitialValues] = useState<FormData>();
  const [loadingDuplicate, setLoadingDuplicate] = useState(Boolean(duplicateId));
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<ComposeMode>('transaction');
  const [preferredCategoryType, setPreferredCategoryType] = useState<CategoryType | null>(null);
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
            : 'Registre seus gastos e receitas de forma rápida e inteligente.'
      }
    >
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
        <TransferForm
          onSelectTransactionType={(type) => {
            setPreferredCategoryType(type);
            setComposeMode('transaction');
          }}
        />
      ) : (
        <TransactionForm
          isEditing={false}
          initialValues={initialValues}
          initialCategoryType={preferredCategoryType}
          onSelectTransfer={isDuplicating ? undefined : () => setComposeMode('transfer')}
        />
      )}
    </NewPage>
  );
}
