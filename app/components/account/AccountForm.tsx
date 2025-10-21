// app/components/accounts/AccountForm.tsx
'use client';

import { useEffect } from 'react';

import { accountService } from '@/app/services';

import { useAuth } from '@/app/context';

import { AccountModel, AccountType } from '@/app/types/account';

import { Input, Select, BaseForm, ColorIconSelector, ActiveToggle } from '@/app/components';

import { useFormManager, useCurrencyFormatter } from '@/app/hook';

interface AccountFormProps {
  account?: AccountModel | null;
  isEditing: boolean;
  onSubmitSuccess: (message: string) => void;
  onCancel: () => void;
  submitting: boolean;
}

// Opções para o select de tipo de conta
const accountTypeOptions = [
  { value: 'CREDIT_DEBIT', label: 'Crédito/Débito' },
  { value: 'INVESTMENT', label: 'Investimento' },
];

// Opções de moedas
const currencyOptions = [
  { value: 'BRL', label: 'Real (BRL)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

const initialFormData = {
  name: '',
  balance: 0,
  type: 'CREDIT_DEBIT' as AccountType,
  currency: 'BRL',
  color: '#3B82F6',
  icon: 'wallet',
  description: '',
  isActive: true,
  userId: ''
};

export default function AccountForm({
  account,
  isEditing,
  onSubmitSuccess,
  onCancel,
  submitting,
}: AccountFormProps) {
  const { user } = useAuth();

  const currencyFormatter = useCurrencyFormatter({
    initialValue: 'R$ 0,00'
  });

  const formManager = useFormManager({
    initialData: initialFormData,
    editingItem: account,
    isEditing,
    onSubmit: async (data) => {
      const accountData = {
        name: data.name,
        balance: data.balance,
        type: data.type,
        currency: data.currency,
        color: data.color,
        icon: data.icon,
        description: data.description || null,
        isActive: data.isActive,
        userId: user!.id
      };

      if (isEditing && account) {
        return await accountService.updateAccount({
          ...account,
          ...accountData
        });
      } else {
        return await accountService.createAccount(accountData);
      }
    },
    onSuccess: onSubmitSuccess,
    userId: user?.id
  });

  // Update balance when display value changes
  const handleBalanceChange = (value: string) => {
    currencyFormatter.handleCurrencyChange(value);
    const cents = currencyFormatter.formatCurrencyToCents(value);
    formManager.setFormData({ balance: cents });
  };

  // Set initial balance when editing
  useEffect(() => {
    if (account && isEditing) {
      const formattedBalance = currencyFormatter.formatCentsToCurrency(account.balance);
      currencyFormatter.setDisplayValue(formattedBalance);
    }
  }, [account, isEditing, currencyFormatter]); // Adicionado currencyFormatter como dependência

  const inputError = (formManager.error && formManager.error.split(';')) || [];

  return (
    <BaseForm
      submitting={submitting}
      error={formManager.error}
      onSubmit={formManager.handleSubmit}
      onCancel={onCancel}
      isEditing={isEditing}
    >
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-4 sm:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <Input
            label="Nome da Conta"
            name="name"
            value={formManager.formData.name}
            onChange={(e) => formManager.setFormData({ name: e.target.value })}
            placeholder="Ex: Conta Corrente BB, Carteira, NuInvest, etc."
            required
            disabled={submitting}
            variant="outlined"
            size="sm"
            error={inputError.filter(a => a.toLowerCase().includes('nome')).join('; ') || ''}
          />

          <Input
            type="text"
            label="Saldo Inicial"
            value={currencyFormatter.displayValue}
            onChange={handleBalanceChange}
            placeholder="R$ 0,00"
            variant="outlined"
            size="sm"
            required
            disabled={submitting}
            loading={submitting}
            error={inputError.filter(a => a.toLowerCase().includes('saldo')).join('; ') || ''}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Select
              label="Tipo de Conta"
              name="type"
              value={formManager.formData.type}
              onChange={(value) => formManager.setFormData({ type: value as AccountType })}
              options={accountTypeOptions}
              placeholder="Selecione o tipo"
              disabled={submitting}
              size="sm"
              required
              error={inputError.filter(a => a.toLowerCase().includes('tipo')).join('; ') || ''}
            />

            <Select
              label="Moeda"
              name="currency"
              value={formManager.formData.currency}
              onChange={(value) => formManager.setFormData({ currency: String(value) })}
              options={currencyOptions}
              disabled={submitting}
              size="sm"
              required
              error={inputError.filter(a => a.toLowerCase().includes('moeda')).join('; ') || ''}
            />
          </div>

          <ColorIconSelector
            color={formManager.formData.color}
            icon={formManager.formData.icon}
            onColorChange={(color) => formManager.setFormData({ color })}
            onIconChange={(icon) => formManager.setFormData({ icon })}
            disabled={submitting}
            colorLabel="Cor da conta"
          />

          <Input
            label="Descrição (Opcional)"
            name="description"
            value={formManager.formData.description}
            onChange={(e) => formManager.setFormData({ description: e.target.value })}
            placeholder="Descrição detalhada da conta..."
            disabled={submitting}
            variant="outlined"
            size="sm"
          />

          <ActiveToggle
            isActive={formManager.formData.isActive}
            onToggle={(isActive) => formManager.setFormData({ isActive })}
            disabled={submitting}
            label="Conta ativa"
            activeLabel="Ativa"
            inactiveLabel="Inativa"
          />
        </div>
      </div>
    </BaseForm>
  );
}
