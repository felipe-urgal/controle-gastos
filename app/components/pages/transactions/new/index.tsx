'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { NewPage } from '@/app/components/base-pages';
import { TransactionForm } from '@/app/components/pages/transactions';
import TransferForm from '@/app/components/pages/transactions/transfer-form';
import { useAuth } from '@/app/context';
import { FormData } from '@/app/lib/interface/transaction.interface';
import {
  clearOfflineTransactionDraft,
  offlineDraftToFormData,
  readOfflineTransactionDraft,
  type OfflineTransactionDraft,
} from '@/app/lib/pwa/offline-transaction-draft';
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

function draftAmountLabel(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export default function New({
  duplicateId,
  templateId,
  initialMode = 'transaction',
  initialCategoryType = 'EXPENSE',
}: NewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [initialValues, setInitialValues] = useState<FormData>();
  const [loadingDuplicate, setLoadingDuplicate] = useState(Boolean(duplicateId || templateId));
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [composeMode, setComposeMode] = useState<ComposeMode>(duplicateId || templateId ? 'transaction' : initialMode);
  const [preferredCategoryType, setPreferredCategoryType] = useState<CategoryType | null>(initialCategoryType);
  const [offlineDraft, setOfflineDraft] = useState<OfflineTransactionDraft | null>(null);
  const [loadedOfflineDraftId, setLoadedOfflineDraftId] = useState<string | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  const isDuplicating = Boolean(duplicateId);
  const isUsingTemplate = Boolean(templateId);
  const isTransfer = !isDuplicating && composeMode === 'transfer';
  const canUseOfflineDraft = !isDuplicating && !isUsingTemplate;

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

  useEffect(() => {
    if (!user?.id || !canUseOfflineDraft) return;

    let cancelled = false;

    async function loadOfflineDraft() {
      await Promise.resolve();
      if (cancelled) return;
      setOfflineDraft(readOfflineTransactionDraft(user.id));
    }

    void loadOfflineDraft();
    return () => {
      cancelled = true;
    };
  }, [canUseOfflineDraft, user?.id]);

  function continueOfflineDraft() {
    if (!offlineDraft) return;

    setInitialValues(offlineDraftToFormData(offlineDraft));
    setPreferredCategoryType(offlineDraft.type);
    setComposeMode('transaction');
    setLoadedOfflineDraftId(offlineDraft.id);
    setFormRevision((current) => current + 1);
  }

  function discardOfflineDraft() {
    if (!user?.id) return;

    clearOfflineTransactionDraft(user.id);
    setOfflineDraft(null);

    if (loadedOfflineDraftId) {
      setInitialValues(undefined);
      setLoadedOfflineDraftId(null);
      setPreferredCategoryType(initialCategoryType);
      setFormRevision((current) => current + 1);
    }
  }

  function handleOfflineDraftSaved() {
    if (!user?.id || !loadedOfflineDraftId) return;

    clearOfflineTransactionDraft(user.id);
    setOfflineDraft(null);
    setLoadedOfflineDraftId(null);
    router.replace('/transacoes');
  }

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
      {offlineDraft && canUseOfflineDraft && !isTransfer && (
        <section
          role="status"
          className="mt-4 rounded-[var(--radius-lg)] border border-[var(--orbit-primary)]/35 bg-[var(--orbit-primary-subtle)] p-4"
          aria-label="Rascunho offline"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-[var(--foreground)]">
                {loadedOfflineDraftId === offlineDraft.id
                  ? 'Rascunho offline carregado'
                  : 'Rascunho offline encontrado'}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {offlineDraft.description} · {draftAmountLabel(offlineDraft.amount)} ·{' '}
                {offlineDraft.type === 'EXPENSE' ? 'Despesa' : 'Receita'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Nada será enviado automaticamente. Revise os dados, escolha conta e categoria e confirme a criação normalmente.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {loadedOfflineDraftId !== offlineDraft.id && (
                <button
                  type="button"
                  onClick={continueOfflineDraft}
                  className="min-h-10 rounded-full bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white"
                >
                  Continuar rascunho
                </button>
              )}
              <button
                type="button"
                onClick={discardOfflineDraft}
                className="min-h-10 rounded-full border border-[var(--border-strong)] px-4 text-sm font-bold text-[var(--foreground)]"
              >
                Descartar
              </button>
            </div>
          </div>
        </section>
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
        <TransferForm
          onSelectTransactionType={(type) => {
            setPreferredCategoryType(type);
            setComposeMode('transaction');
          }}
        />
      ) : (
        <TransactionForm
          key={`transaction-form-${formRevision}`}
          isEditing={false}
          initialValues={initialValues}
          initialCategoryType={preferredCategoryType}
          onSuccess={loadedOfflineDraftId ? handleOfflineDraftSaved : undefined}
          onSelectTransfer={isDuplicating ? undefined : () => setComposeMode('transfer')}
        />
      )}
    </NewPage>
  );
}
