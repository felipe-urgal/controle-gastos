'use client';

import { FaPowerOff } from 'react-icons/fa';

import { ShowPage } from '@/app/components/base-pages';
import AccountShowView from '@/app/components/pages/account/show/account-show-view';
import { DELETE_BLOCKED_HINT } from '@/app/components/pages/account/show/account-app-bar-actions';
import CreditCardOverview from '@/app/components/pages/account/show/credit-card-overview';
import { Button } from '@/app/components/ui';
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
    setActive,
    isUpdatingStatus,
    statusError,
  } = useAccounts({ id });

  const editUrl = `/contas/alterar/${id}`;
  const toggleActive = () => void setActive(!account?.isActive);
  const sharedProps = {
    backUrl: handleBack,
    editUrl,
    isDeleting,
    onDeleteRequest: () => setIsDeleteModalOpen(true),
    onToggleActive: toggleActive,
    isUpdatingStatus,
    statusError,
  };

  const content = account ? (
    account.type === 'CREDIT_CARD' ? (
      <CreditCardOverview account={account} {...sharedProps} />
    ) : (
      <AccountShowView account={account} typeLabels={typeLabels} {...sharedProps} />
    )
  ) : null;

  return (
    <ShowPage
      entity={account}
      entityName="conta"
      titleFallback="Detalhes da conta"
      sidebarAligned
      loading={loading}
      editUrl={editUrl}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      emptyRedirectTo="/contas"
      deleteDisabled={account?.isDeletable === false}
      deleteHint={DELETE_BLOCKED_HINT}
      headerActions={
        <Button
          variant="outline"
          icon={<FaPowerOff />}
          onClick={toggleActive}
          disabled={isUpdatingStatus || isDeleting}
        >
          {account?.isActive === false ? 'Reativar conta' : 'Inativar conta'}
        </Button>
      }
      mobileContent={content}
    >
      {content}
    </ShowPage>
  );
}
