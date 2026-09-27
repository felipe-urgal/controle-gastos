'use client';

import { ShowPage } from '@/app/components/base-pages';
import { AccountInfo } from '@/app/components/pages/account';
import MobileAccountShow from '@/app/components/pages/account/show/mobile-account-show';
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
    refreshAccount,
  } = useAccounts({ id });

  return (
    <ShowPage
      entity={account}
      entityName="conta"
      titleFallback="Detalhes da conta"
      description="Consulte saldo, identificação, reconciliação e as movimentações recentes vinculadas a esta conta."
      loading={loading}
      editUrl={`/contas/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      emptyRedirectTo="/contas"
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
            <MobileAccountShow
              account={account}
              typeLabels={typeLabels}
              backUrl={handleBack}
              editUrl={`/contas/alterar/${id}`}
              isDeleting={isDeleting}
              onDeleteRequest={() => setIsDeleteModalOpen(true)}
              onReconciliationChange={refreshAccount}
            />
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
        <AccountInfo
          account={account!}
          isDeleting={isDeleting}
          typeLabels={typeLabels}
          onReconciliationChange={refreshAccount}
        />
      )}
    </ShowPage>
  );
}
