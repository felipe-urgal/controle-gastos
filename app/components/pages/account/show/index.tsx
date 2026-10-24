'use client';

import { ShowPage } from '@/app/components/base-pages';
import AccountShowView from '@/app/components/pages/account/show/account-show-view';
import CreditCardOverview from '@/app/components/pages/account/show/credit-card-overview';
import { useAccounts } from '@/app/hooks/accounts/account-show';

export default function Show({ id }: { id: string }) {
  const {
    account,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
    typeLabels,
  } = useAccounts({ id });

  const accountView = account ? (
    <AccountShowView
      account={account}
      typeLabels={typeLabels}
      backUrl={handleBack}
      editUrl={`/contas/alterar/${id}`}
      isDeleting={isDeleting}
      onDeleteRequest={() => setIsDeleteModalOpen(true)}
    />
  ) : null;

  return (
    <ShowPage
      entity={account}
      entityName="conta"
      titleFallback="Detalhes da conta"
      loading={loading}
      editUrl={`/contas/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      emptyRedirectTo="/contas"
      hideHeaderDelete
      mobileContent={
        account ? (
          account.type === 'CREDIT_CARD' ? (
            <CreditCardOverview
              account={account}
              backUrl={handleBack}
              editUrl={`/contas/alterar/${id}`}
              isDeleting={isDeleting}
              onDeleteRequest={() => setIsDeleteModalOpen(true)}
            />
          ) : (
            accountView
          )
        ) : null
      }
    >
      {account?.type === 'CREDIT_CARD' ? (
        <CreditCardOverview
          account={account}
          backUrl={handleBack}
          editUrl={`/contas/alterar/${id}`}
          isDeleting={isDeleting}
          onDeleteRequest={() => setIsDeleteModalOpen(true)}
        />
      ) : (
        accountView
      )}
    </ShowPage>
  );
}
