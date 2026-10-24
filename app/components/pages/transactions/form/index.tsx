'use client';

import { TransactionFormProps } from '@/app/components/pages/transactions/form/transaction-form-shared';
import { LearningOption, TransactionReviewModal } from '@/app/components/pages/transactions/form/transaction-review-modal';
import { useTransactionForm } from '@/app/components/pages/transactions/form/use-transaction-form';
import { MobileTransactionWizard } from '@/app/components/pages/transactions/form/mobile-transaction-wizard';
import { DesktopTransactionForm } from '@/app/components/pages/transactions/form/desktop-transaction-form';

export default function TransactionForm({
  transaction,
  isEditing,
  initialDate,
  initialValues,
  onSuccess,
  onCancelOverride,
  initialCategoryType = null,
  onSelectTransfer,
  offlineOwnerUserId,
  offlineDraftId,
  onOfflineQueueChanged,
  reviewingQueueItem,
  onReviewedQueueItem,
}: TransactionFormProps) {
  const form = useTransactionForm({ transaction, isEditing, initialDate, initialValues, onSuccess, onCancelOverride, initialCategoryType, onSelectTransfer, offlineOwnerUserId, offlineDraftId, onOfflineQueueChanged, reviewingQueueItem, onReviewedQueueItem });
  const { formData, reviewOpen, setReviewOpen, learnMerchantCorrection, setLearnMerchantCorrection, learnCategoryCorrection, setLearnCategoryCorrection, merchantLearningOperator, setMerchantLearningOperator, categoryLearningOperator, setCategoryLearningOperator, storageUnavailable, isSubmitting, isDesktop, selectedAccount, selectedCategory, selectedMerchant, learningSuggestions, hasLearningSuggestions, formatCentsToCurrency, persistTransaction, operationLabel } = form;

  return (
    <>
      {!isDesktop && <MobileTransactionWizard form={form} />}

      {storageUnavailable && !isEditing && (
        <p role="alert" className="mt-3 rounded-lg border border-[var(--warning)]/35 bg-[var(--warning-subtle)] p-3 text-sm text-[var(--foreground)]">
          O armazenamento local está indisponível. Esta aba mantém a chave de segurança durante tentativas de reenvio,
          mas, se a resposta do servidor se perder e a página for recarregada, não será possível recuperar a tentativa.
          Antes de criar novamente, confira se o lançamento já existe em Transações.
        </p>
      )}
      {isDesktop && <DesktopTransactionForm form={form} />}

      <TransactionReviewModal
        isOpen={reviewOpen}
        isLoading={isSubmitting}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => {
          setReviewOpen(false);
          void persistTransaction();
        }}
        operationLabel={operationLabel}
        amount={formatCentsToCurrency(formData.amount)}
        account={selectedAccount?.name ?? 'Não selecionada'}
        category={selectedCategory?.name ?? 'Não selecionada'}
        merchant={selectedMerchant?.name ?? 'Não informado'}
        title={isEditing ? 'Revisar alterações' : 'Revisar transação'}
        description={isEditing ? 'Confira a correção e escolha o que deve ser reaproveitado no futuro.' : 'Confira os dados antes de criar.'}
        confirmLabel={isEditing ? 'Salvar alterações' : 'Criar transação'}
      >
        {isEditing && hasLearningSuggestions ? (
          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">Aplicar a futuras transações semelhantes?</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Nada é alterado sem sua confirmação. Se já existir um alias equivalente em outro estabelecimento, ele será movido para a escolha abaixo.
            </p>

            {learningSuggestions.merchant ? (
              <LearningOption
                checked={learnMerchantCorrection}
                onCheckedChange={setLearnMerchantCorrection}
                label={transaction.merchant?.name && transaction.merchant.name !== selectedMerchant?.name
                  ? `Mover reconhecimento de ${transaction.merchant.name} para ${selectedMerchant?.name ?? 'estabelecimento selecionado'}`
                  : `Reconhecer como ${selectedMerchant?.name ?? 'estabelecimento selecionado'}`}
                pattern={learningSuggestions.merchant.pattern}
                operator={merchantLearningOperator}
                onOperatorChange={setMerchantLearningOperator}
              />
            ) : null}

            {learningSuggestions.category ? (
              <LearningOption
                checked={learnCategoryCorrection}
                onCheckedChange={setLearnCategoryCorrection}
                label={`Categorizar como ${selectedCategory?.name ?? 'categoria selecionada'}`}
                pattern={learningSuggestions.category.rule.descriptionPattern}
                operator={categoryLearningOperator}
                onOperatorChange={setCategoryLearningOperator}
              />
            ) : null}

            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Regras e aliases continuam removíveis nas telas de Regras de importação e Estabelecimentos.
            </p>
          </div>
        ) : null}
      </TransactionReviewModal>
    </>
  );
}
