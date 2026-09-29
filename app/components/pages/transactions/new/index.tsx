'use client';

import { useEffect, useState } from 'react';

import { NewPage } from '@/app/components/base-pages';
import { TransactionForm } from '@/app/components/pages/transactions';
import TransferForm from '@/app/components/pages/transactions/transfer-form';
import { FormData } from '@/app/lib/interface/transaction.interface';
import { getDuplicateTransactionValues } from '@/app/lib/transactions/transaction-quick-actions';
import { transactionService } from '@/app/services/transaction-service';
import { transactionTemplateService } from '@/app/services/transaction-template-service';

type ComposeMode = 'transaction' | 'transfer';
type CategoryType = 'INCOME' | 'EXPENSE';

interface NewProps {
  duplicateId?: string;
  templateId?: string;
  initialMode?: ComposeMode;
  initialCategoryType?: CategoryType;
}

export default function New({
  duplicateId,
  templateId,
  initialMode = 'transaction',
  initialCategoryType = 'EXPENSE',
}: NewProps) {
  const [initialValues, setInitialValues] = useState<FormData>();
  const [loadingDuplicate, setLoadingDuplicate] = useState(Boolean(duplicateId || templateId));
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<ComposeMode>(duplicateId || templateId ? 'transaction' : initialMode);
  const [preferredCategoryType, setPreferredCategoryType] = useState<CategoryType | null>(initialCategoryType);
  const isDuplicating = Boolean(duplicateId);
  const isUsingTemplate = Boolean(templateId);
  const isTransfer = !isDuplicating && composeMode === 'transfer';

  useEffect(() => {
    if (!duplicateId && !templateId) return;

    let cancelled = false;

    async function loadSource() {
      setLoadingDuplicate(true);
      setDuplicateError(null);

      try {
        if (duplicateId) {
          const response = await transactionService.getById(duplicateId);
          if (!cancelled) {
            setInitialValues(getDuplicateTransactionValues(response.data));
            setPreferredCategoryType(response.data.type);
          }
        } else if (templateId) {
          const response = await transactionTemplateService.getById(templateId);
          const template = response.data;
          const now = new Date();
          if (!cancelled) {
            setInitialValues({
              amount: template.amount ?? 0,
              month: now.getMonth() + 1,
              year: now.getFullYear(),
              day: now.getDate(),
              description: template.description,
              status: template.status,
              accountId: template.account?.id ?? '',
              categoryId: template.category?.id ?? '',
              allocations: [],
            });
            setPreferredCategoryType(template.type);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setDuplicateError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os dados iniciais',
          );
        }
      } finally {
        if (!cancelled) setLoadingDuplicate(false);
      }
    }

    void loadSource();
    return () => { cancelled = true; };
  }, [duplicateId, templateId]);

  return (
    <NewPage
      backUrl="/transacoes"
      title={isDuplicating ? 'Duplicar transação' : isUsingTemplate ? 'Usar modelo' : isTransfer ? 'Nova transferência' : 'Nova transação'}
      description={
        isDuplicating
          ? 'Revise os dados copiados e confirme somente quando o novo lançamento estiver correto.'
          : isUsingTemplate
            ? 'O modelo apenas preenche o formulário. Revise os dados antes de salvar.'
          : isTransfer
            ? 'Mova saldo entre contas próprias sem criar receita ou despesa operacional.'
            : 'Crie sua transação em poucos segundos.'
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
