// app/components/accounts/AccountCard.tsx
'use client';

import { AccountModel } from '@/app/types/account';

import { BaseCard, IconRenderer } from '@/app/components';

import { useAuth } from '@/app/context';

interface AccountCardProps {
  account: AccountModel;
  onEdit: (account: AccountModel) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (account: AccountModel) => void;
  isDeleting?: boolean;
  isToggling?: boolean;
  clickable?: boolean;
  compact?: boolean;
}

export default function AccountCard({
  account,
  onEdit,
  onDelete,
  onToggleActive,
  isDeleting,
  isToggling,
  clickable = true,
  compact = false
}: AccountCardProps) {
  const { user } = useAuth();

  const typeLabels: { [key: string]: string } = {
    CREDIT_DEBIT: 'Crédito/Débito',
    INVESTMENT: 'Investimento',
  };

  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    if (!user?.showValues) return '*****';
    
    const amountInReais = amount / 100;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amountInReais);
  };

  return (
    <BaseCard
      // Dados principais
      title={account.name}
      description={account.description}
      color={account.color}
      icon={account.icon || 'wallet'}
      iconRenderer={(iconName, size) => (
        <IconRenderer iconName={iconName} size={size} />
      )}
      
      // Status e tipo
      isActive={account.isActive}
      type={account.type}
      typeLabels={typeLabels}
      
      // Ações
      onEdit={() => onEdit(account)}
      onToggleActive={onToggleActive ? () => onToggleActive(account) : undefined}
      onDelete={onDelete ? () => onDelete(account.id) : undefined}
      
      // Estados
      isDeleting={isDeleting}
      isToggling={isToggling}
      
      // Configurações
      clickable={clickable}
      compact={compact}
      showBalance={true}
      balance={account.balance}
      balanceFormatter={(amount) => formatCurrency(amount, account.currency)}
    />
  );
}