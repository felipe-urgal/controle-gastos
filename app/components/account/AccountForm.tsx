"use client"

import { useState, useEffect } from 'react';
import { accountService } from '@/app/services/accountService';
import { useAuth } from '@/app/context/AuthContext';
import { AccountModel, AccountType } from '@/app/types/account';
import { Button, Input, Select, IconSelector } from '@/app/components';
import IconRenderer, { useIcons } from '@/app/components/ui/IconRenderer';
import { useThemeColors } from '@/app/hook/useThemeColors';

interface AccountFormProps {
  account?: AccountModel | null;
  isEditing: boolean;
  onSubmitSuccess: (message: string) => void;
  onCancel: () => void;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
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
  balance: 'R$ 0,00',
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
  setSubmitting
}: AccountFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account && isEditing) {
      const amountFormatted = formatCentsToCurrency(account.balance);

      setFormData({
        name: account.name,
        balance: amountFormatted,
        type: account.type,
        currency: account.currency || 'BRL',
        color: account.color || '#3B82F6',
        icon: account.icon || 'wallet',
        description: account.description || '',
        isActive: account.isActive,
        userId: account.userId
      });
    } else {
      setFormData({
        ...initialFormData,
        userId: user?.id || ''
      });
    }
  }, [account, isEditing, user]);

  // CORREÇÃO: Converter valor para centavos - versão simplificada
  const formatCurrencyToCents = (value: string): number => {
    if (!value || value === 'R$ 0,00') return 0;
    
    try {
      // Remove R$, pontos e substitui vírgula por ponto
      const cleaned = value
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim();
      
      const parsed = parseFloat(cleaned);
      
      if (isNaN(parsed) || !isFinite(parsed)) {
        return 0;
      }
      
      // CORREÇÃO: Já está em reais, só converter para centavos
      return Math.round(parsed * 100);
    } catch (error) {
      console.error('Erro ao converter valor para centavos:', error);
      return 0;
    }
  };

  // Formatar valor para exibição (de centavos para real)
  const formatCentsToCurrency = (cents: number): string => {
    const amountInReais = cents / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);
  };

  // Handler para campo de valor monetário - CORRIGIDO
  const handleAmountChange = (value: string) => {
    // Remove tudo que não é dígito
    const numericValue = value.replace(/\D/g, "");
    
    // Se estiver vazio, define como R$ 0,00
    if (!numericValue) {
      setFormData({...formData, balance: 'R$ 0,00' });
      return;
    }

    // Converte para número (em centavos) e depois formata para exibição
    const cents = parseInt(numericValue);
    const amountInReais = cents / 100;
    
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amountInReais);

    setFormData({...formData, balance: formattedValue});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSubmitting(true);
    setError('');

    try {
      const amountInCents = formatCurrencyToCents(formData.balance);

      const accountData = {
        name: formData.name,
        balance: amountInCents,
        type: formData.type,
        currency: formData.currency,
        color: formData.color,
        icon: formData.icon,
        description: formData.description || null,
        isActive: formData.isActive,
        userId: user.id
      };

      if (isEditing && account) {
        const result = await accountService.updateAccount({
          ...account,
          ...accountData
        });

        if (result.success) {
          onSubmitSuccess(result.message);
        } else {
          setError(result.message)
        }
      } else {
        const result = await accountService.createAccount(accountData);

        if (result.success) {
          onSubmitSuccess(result.message);
        } else {
          setError(result.message)
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar conta');
      console.error('Erro ao salvar conta:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const { getIconLabel } = useIcons();

  const colors = useThemeColors();

  const inputError = (error && error.split(';')) || []

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 sm:p-4 lg:p-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-4 sm:gap-6">
          {/* Coluna do formulário */}
          <div className="space-y-3 sm:space-y-4">
            <Input
              label="Nome da Conta"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Conta Corrente BB, Carteira, NuInvest, etc."
              required
              disabled={submitting}
              variant="outlined"
              size="sm"
              error={inputError.filter(a => a.toLowerCase().includes('nome')).join('; ') || ''}
            />

            {/* Valor */}
            <Input
              type="text"
              label="Saldo Inicial"
              value={formData.balance}
              onChange={(e) => handleAmountChange(e.target.value)}
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
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value as AccountType })}
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
                value={formData.currency}
                onChange={(value) => setFormData({ ...formData, currency: String(value) })}
                options={currencyOptions}
                disabled={submitting}
                size="sm"
                required
                error={inputError.filter(a => a.toLowerCase().includes('moeda')).join('; ') || ''}
              />
            </div>

            {/* Seletor de Cores - Mobile Optimized */}
            <div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center justify-start sm:justify-start">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Cor
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={submitting}
                  className="w-20 h-8 rounded cursor-pointer border border-gray-300"
                  title="Escolher cor manualmente"
                />

                <div className={`
                  ${colors.border.accent} border rounded-full px-3 py-1
                  flex items-center gap-3 transition-all
                `}>
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: formData.color || '#3B82F6' }}
                  >
                    <IconRenderer 
                      iconName={formData.icon} 
                      className="w-3.5 h-3.5"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs ${colors.text.secondary} capitalize`}>
                      {getIconLabel(formData.icon)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seletor de Ícones */}
            <div className="mt-4">
              <IconSelector
                value={formData.icon}
                onChange={(icon) => setFormData({ ...formData, icon })}
                disabled={submitting}
                mode='compact'
              />
            </div>

            <Input
              label="Descrição (Opcional)"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição detalhada da conta..."
              disabled={submitting}
              variant="outlined"
              size="sm"
            />

            <div className={`flex items-center gap-3 p-3 rounded-lg ${colors.bg.tertiary}`}>
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 transition-colors"
                  disabled={submitting}
                />
                <span className={`text-sm font-medium ${colors.text.tertiary}`}>
                  Conta ativa
                </span>
              </label>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                formData.isActive 
                  ? colors.state.active
                  : colors.state.disabled
              }`}>
                {formData.isActive ? 'Ativa' : 'Inativa'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ações Desktop - Aparece apenas em desktop */}
      <div className={`p-4 lg:p-6 border-t ${colors.border.primary}  flex-shrink-0`}>
        <div className="flex gap-3 w-full max-w-2xl ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="flex-1"
            isLoading={submitting}
            disabled={submitting}
          >
            {isEditing ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </form>
  );
}
