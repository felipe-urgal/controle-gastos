'use client';

import { EditPage } from '@/app/components/base-pages';
import TransactionForm from '@/app/components/pages/transactions/form';
import TransferForm from '@/app/components/pages/transactions/transfer-form';
import { useTransactions } from '@/app/hooks/transactions/transaction-edit';

export default function Edit({ id }: { id: string }) {
  const { transaction, loading, error, handleBack } = useTransactions({ id });
  const isTransfer = transaction?.kind === 'TRANSFER' && Boolean(transaction.transferId);
  const isCardPayment = transaction?.kind === 'CARD_PAYMENT';
  const isOpeningBalance = transaction?.kind === 'OPENING_BALANCE';

  return (
    <EditPage
      title={isTransfer ? 'Editar transferência' : 'Editar transação'}
      sidebarAligned
      breadcrumb={[
        { label: 'Transações', href: '/transacoes' },
        { label: 'Transação', href: `/transacoes/show/${id}` },
        { label: 'Editar' },
      ]}
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      {isTransfer && transaction?.transferId ? (
        <TransferForm transferId={transaction.transferId} />
      ) : isCardPayment ? (
        <div role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
          Pagamentos de fatura são mantidos pelo fluxo dedicado do cartão e não podem ser editados como uma transação comum.
        </div>
      ) : isOpeningBalance ? (
        <div role="alert" className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
          O saldo inicial foi criado junto com a conta e não pode ser editado como uma transação comum. Para ajustar o saldo, registre um novo lançamento.
        </div>
      ) : (
        <TransactionForm isEditing transaction={transaction} />
      )}
    </EditPage>
  );
}
