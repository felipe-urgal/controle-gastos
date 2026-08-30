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

  return (
    <ShowPage
      entity={transaction}
      entityName="transação"
      titleFallback="Detalhes da transação"
      description="Consulte os dados do lançamento, edite esta ocorrência ou remova a transação."
      loading={loading}
      editUrl={`/transacoes/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      emptyRedirectTo="/transacoes"
    >
      <TransactionInfo transaction={transaction!} isDeleting={isDeleting} />
    </ShowPage>
  );
}
