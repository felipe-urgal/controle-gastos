// app/components/accounts/AccountsList.tsx
'use client';

import { FaWallet } from 'react-icons/fa';

import { accountService } from '@/app/services';

import { AccountModel } from '@/app/types/account';

import { AccountCard, BaseList } from '@/app/components';

import { useListManager } from '@/app/hook';

interface AccountsListProps {
  accounts: AccountModel[];
  filteredAccounts: AccountModel[];
  loading: boolean;
  onEdit: (account: AccountModel) => void;
  onDelete: (accounts: AccountModel[]) => void;
  onToggleActive: (accounts: AccountModel[]) => void;
  onError: (error: string) => void;
  onSuccess: (success: string) => void;
  onAdd: () => void;
}

export default function AccountsList({
  accounts,
  filteredAccounts,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
  onError,
  onSuccess,
  onAdd
}: AccountsListProps) {
  const listManager = useListManager({
    onDelete,
    onToggleActive,
    onError,
    onSuccess
  });

  const handleDelete = (id: string) => {
    listManager.handleDelete(id, accounts, accountService.deleteAccount, 'conta');
  };

  const handleToggleActive = (account: AccountModel) => {
    listManager.handleToggleActive(account, accounts, accountService.updateAccount, 'conta');
  };

  const renderAccount = (account: AccountModel) => (
    <AccountCard
      key={account.id}
      account={account}
      onEdit={onEdit}
      onDelete={() => handleDelete(account.id)}
      onToggleActive={() => handleToggleActive(account)}
      isDeleting={listManager.deletingId === account.id}
      isToggling={listManager.togglingId === account.id}
    />
  );

  const emptyIcon = <FaWallet className="text-gray-400 text-4xl mb-4" />;

  return (
    <BaseList
      filteredItems={filteredAccounts}
      loading={loading}
      emptyIcon={emptyIcon}
      emptyTitle={accounts.length === 0 ? 'Nenhuma conta cadastrada' : 'Nenhuma conta encontrada'}
      emptyDescription={accounts.length === 0 
        ? 'Comece criando sua primeira conta para organizar suas finanças.' 
        : 'Tente ajustar os filtros para encontrar o que procura.'
      }
      addButtonText="Adicionar Primeira Conta"
      onAdd={onAdd}
      renderItem={renderAccount}
      itemName="conta"
    />
  );
}
