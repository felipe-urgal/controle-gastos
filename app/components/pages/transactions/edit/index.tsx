'use client';

import { EditPage } from '@/app/components/base-pages';
import { TransactionForm } from '@/app/components/pages/transactions';
import TransferForm from '@/app/components/pages/transactions/transfer-form';
import { useTransactions } from '@/app/hooks/transactions/transaction-edit';

export default function Edit({ id }: { id: string }) {
  const { transaction, loading, error, handleBack } = useTransactions({ id });
  const isTransfer = transaction?.kind === 'TRANSFER' && Boolean(transaction.transferId);
  const isCardPayment = transaction?.kind === 'CARD_PAYMENT';

  return (
    <EditPage
      title={isTransfer ? 'Editar transferência' : 'Editar transação'}
      description={
        isTransfer
          ? 'Atualize valor, data, descrição ou status da operação vinculada.'
          : 'Atualize os dados deste lançamento mantendo o mesmo fluxo da criação.'
      }
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      {isTransfer && transaction?.transferId ? (
        <TransferForm transferId={transaction.transferId} />
      ) : isCardPayment ? (
        <div role="alert" className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
          Pagamentos de fatura são mantidos pelo fluxo dedicado do cartão e não podem ser editados como uma transação comum.
        </div>
      ) : (
        <TransactionForm isEditing transaction={transaction} />
      )}
    </EditPage>
  );
}
