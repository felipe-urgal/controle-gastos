// app/components/import/AccountSelector.tsx
'use client';

import { useEffect, useState } from 'react';

import { useThemeColors } from '@/app/hook';

import { accountService } from '@/app/services';

import { AccountModel } from '@/app/types/account';

import { useAuth } from '@/app/context';

interface AccountSelectorProps {
  onAccountSelect: (accountId: string) => void;
  selectedAccountId: string;
}

export default function AccountSelector({ onAccountSelect, selectedAccountId }: AccountSelectorProps) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const response = await accountService.getAccounts(user.id);
        const activeAccounts = response.data?.items?.filter(acc => acc.isActive) || [];
        setAccounts(activeAccounts);
        
        // Selecionar primeira conta automaticamente se nenhuma estiver selecionada
        if (activeAccounts.length > 0 && !selectedAccountId) {
          onAccountSelect(activeAccounts[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar contas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [user?.id, selectedAccountId, onAccountSelect]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className={`h-4 ${colors.calendar.skeleton.bg} rounded w-32`}></div>
        <div className={`h-10 ${colors.calendar.skeleton.bg} rounded`}></div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className={`p-4 rounded-lg border ${colors.border.primary} ${colors.bg.secondary} text-center`}>
        <p className={`text-sm ${colors.text.primary} mb-2`}>
          Nenhuma conta ativa encontrada
        </p>
        <p className={`text-xs ${colors.text.secondary}`}>
          Crie uma conta antes de importar transações
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => onAccountSelect(account.id)}
            className={`
              flex items-center p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedAccountId === account.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : `${colors.border.primary} ${colors.bg.primary} hover:border-blue-300`
              }
            `}
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                {account.icon && (
                  <span className={`text-lg ${colors.text.secondary}`}>
                    {account.icon}
                  </span>
                )}
                <span className={`font-medium ${colors.text.primary}`}>
                  {account.name}
                </span>
              </div>
              
              <div className={`text-xs ${colors.text.secondary}`}>
                {account.type === 'CREDIT_DEBIT' ? 'Crédito/Débito' : 'Investimento'}
              </div>
              
              <div className={`text-xs font-medium mt-1 ${
                selectedAccountId === account.id ? 'text-blue-600 dark:text-blue-400' : colors.text.tertiary
              }`}>
                Saldo: R$ {(account.balance / 100).toFixed(2)}
              </div>
            </div>
            
            {selectedAccountId === account.id && (
              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      {selectedAccountId && (
        <div className={`p-3 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
          <p className={`text-sm ${colors.text.primary}`}>
            <strong>Conta selecionada:</strong> {
              accounts.find(acc => acc.id === selectedAccountId)?.name
            }
          </p>
          <p className={`text-xs mt-1 ${colors.text.secondary}`}>
            As transações serão importadas para esta conta
          </p>
        </div>
      )}
    </div>
  );
}