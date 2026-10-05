'use client';

import { ShowPage } from '@/app/components/base-pages';
import { TransactionInfo } from '@/app/components/pages/transactions';
import MobileTransactionShow from '@/app/components/pages/transactions/show/mobile-transaction-show';
import { useTransactions } from '@/app/hooks/transactions/transaction-show';

export default function Show({ id }: { id: string }) {
  const {
    transaction,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
  } = useTransactions({ id });
  const isTransfer = transaction?.kind === 'TRANSFER';
  const isCardPayment = transaction?.kind === 'CARD_PAYMENT';
  const allowMutations = transaction?.kind === 'NORMAL';

  return (
    <ShowPage
      entity={transaction}
      entityName="transação"
      titleFallback={isTransfer ? 'Detalhes da transferência' : isCardPayment ? 'Detalhes do pagamento da fatura' : 'Detalhes da transação'}
      description={isTransfer
        ? 'Consulte esta perna da transferência ligada. Alterações são feitas somente pelo fluxo dedicado da operação.'
        : isCardPayment
          ? 'Consulte o pagamento da fatura. Esta movimentação é mantida pelo fluxo dedicado do cartão.'
          : 'Consulte os dados do lançamento, edite esta ocorrência ou remova a transação.'}
      loading={loading}
      editUrl={`/transacoes/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      allowMutations={allowMutations}
      emptyRedirectTo="/transacoes"
      mobileContent={
        transaction ? (
          <MobileTransactionShow
            transaction={transaction}
            backUrl={handleBack}
            isDeleting={isDeleting}
            allowMutations={allowMutations}
            onRequestDelete={() => setIsDeleteModalOpen(true)}
          />
        ) : (
          <div aria-hidden="true" />
        )
      }
    >
      <TransactionInfo transaction={transaction!} isDeleting={isDeleting} />
    </ShowPage>
  );
}
