"use client"

import { FaWallet, FaPlus } from 'react-icons/fa';
import { accountService } from '@/app/services/accountService';
import { useTheme } from '@/app/context/ThemeContext';
import { AccountModel } from '@/app/types/account';
import { Button, AccountCard } from '@/app/components';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const colors = {
    text: {
      tertiary: isDark ? 'text-gray-400' : 'text-gray-500',
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    // setDeletingId(id);
    try {
      const result = await accountService.deleteAccount(id);
      if (result.success) {
        onDelete(accounts.filter(account => account.id !== id));
        onSuccess('Conta excluída com sucesso!');
      } else {
        onError(result.message || 'Erro ao excluir conta');
      }
    } catch (err: any) {
      onError(err?.message || 'Erro ao excluir conta');
      console.error('Erro ao excluir conta:', err);
    } finally {
      // setDeletingId(null);
    }
  };

  const handleToggleActive = async (account: AccountModel) => {
    try {
      const updatedAccount = await accountService.updateAccount({
        ...account,
        isActive: !account.isActive
      });
      onToggleActive(accounts.map(acc => 
        acc.id === account.id ? updatedAccount : acc
      ));
      onSuccess(`Conta ${!account.isActive ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (err: any) {
      onError('Erro ao alterar status da conta');
      console.error('Erro ao alterar conta:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className={`mt-2 ${colors.text.tertiary}`}>Carregando contas...</p>
      </div>
    );
  }

  if (filteredAccounts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <FaWallet className="text-gray-400 text-4xl mb-4" />
        <p className={`text-center ${colors.text.tertiary} mb-4`}>
          {accounts.length === 0 
            ? 'Nenhuma conta cadastrada' 
            : 'Nenhuma conta encontrada com os filtros atuais'
          }
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          icon={<FaPlus size={14} />}
          className="border border-dashed hover:border-solid"
        >
          Adicionar Primeira Conta
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredAccounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onEdit={onEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>
    </div>
  );
}