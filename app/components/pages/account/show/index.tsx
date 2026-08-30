'use client';

import { ShowPage } from '@/app/components/base-pages';
import { AccountInfo } from '@/app/components/pages/account';
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

  return (
    <ShowPage
      entity={account}
      entityName="conta"
      titleFallback="Detalhes da conta"
      description="Consulte saldo, identificação e as movimentações recentes vinculadas a esta conta."
      loading={loading}
      editUrl={`/contas/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      emptyRedirectTo="/contas"
    >
      <AccountInfo
        account={account!}
        isDeleting={isDeleting}
        typeLabels={typeLabels}
      />
    </ShowPage>
  );
}
