'use client';

import { ShowPage } from '@/app/components/base-pages';
import { TransactionInfo } from '@/app/components/pages/transactions';
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

  return (
    <ShowPage
      entity={transaction}
      entityName="transação"
      titleFallback={isTransfer ? 'Detalhes da transferência' : 'Detalhes da transação'}
      description={isTransfer
        ? 'Consulte esta perna da transferência ligada. Alterações são feitas somente pelo fluxo dedicado da operação.'
        : 'Consulte os dados do lançamento, edite esta ocorrência ou remova a transação.'}
      loading={loading}
      editUrl={`/transacoes/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      allowMutations={!isTransfer}
      emptyRedirectTo="/transacoes"
    >
      <TransactionInfo transaction={transaction!} isDeleting={isDeleting} />
    </ShowPage>
  );
}
