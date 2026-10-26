'use client';

import { FaCopy } from 'react-icons/fa';

import { ShowPage } from '@/app/components/base-pages';
import { pageBarButtonProps } from '@/app/components/base-pages/page-bar';
import { Button } from '@/app/components/ui';
import { DropIn } from '@/app/components/ui/motion';
import TransactionShowSkeleton from '@/app/components/pages/transactions/show/transaction-show-skeleton';
import TransactionInfo from '@/app/components/pages/transactions/show/transaction-info';
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
  const isOpeningBalance = transaction?.kind === 'OPENING_BALANCE';
  const allowMutations = transaction?.kind === 'NORMAL';
  const kindLabel = isTransfer ? 'Transferência' : isCardPayment ? 'Pagamento de fatura' : isOpeningBalance ? 'Saldo inicial' : 'Transação';

  return (
    <ShowPage
      entity={transaction}
      entityName="transação"
      titleFallback={isTransfer ? 'Detalhes da transferência' : isCardPayment ? 'Detalhes do pagamento da fatura' : isOpeningBalance ? 'Detalhes do saldo inicial' : 'Detalhes da transação'}
      sidebarAligned
      animatedActions
      breadcrumb={[{ label: 'Transações', href: '/transacoes' }, { label: kindLabel }]}
      loadingSkeleton={<TransactionShowSkeleton backUrl={handleBack} />}
      loading={loading}
      editUrl={`/transacoes/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      allowMutations={allowMutations}
      headerActions={
        <>
          <DropIn order={1}>
            <Button as="a" href={`/transacoes/nova?duplicate=${encodeURIComponent(id)}`} variant="outline" {...pageBarButtonProps} icon={<FaCopy />}>
              Duplicar
            </Button>
          </DropIn>
          <DropIn order={2}>
            <Button as="a" href={`/modelos?source=${encodeURIComponent(id)}`} variant="outline" {...pageBarButtonProps}>
              Salvar modelo
            </Button>
          </DropIn>
        </>
      }
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
