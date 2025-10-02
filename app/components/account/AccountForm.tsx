"use client"

import { useState, useEffect, useMemo } from 'react';
import { accountService } from '@/app/services/accountService';
import { useAuth } from '@/app/context/AuthContext';
import { AccountModel, AccountType } from '@/app/types/account';
import { Button, Input, Select, IconSelector } from '@/app/components';
import { useTheme } from '@/app/context/ThemeContext';
import IconRenderer, { useIcons } from '@/app/components/ui/IconRenderer';

interface AccountFormProps {
  account?: AccountModel | null;
  isEditing: boolean;
  onSubmitSuccess: (message: string) => void;
  onError: (error: string) => void;
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
  onError,
  onCancel,
  submitting,
  setSubmitting
}: AccountFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);

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
    onError('');

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
        await accountService.updateAccount({
          ...account,
          ...accountData
        });
        onSubmitSuccess('Conta atualizada com sucesso!');
      } else {
        await accountService.createAccount(accountData);
        onSubmitSuccess('Conta criada com sucesso!');
      }
    } catch (err: any) {
      onError(err?.message || 'Erro ao salvar conta');
      console.error('Erro ao salvar conta:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const { resolvedTheme } = useTheme();
  const { getIconLabel } = useIcons();

  const isDark = resolvedTheme === 'dark';

  // Cores baseadas no tema
  const colors = useMemo(() => ({
    border: {
      primary: isDark ? 'border-gray-700' : 'border-gray-200',
      secondary: isDark ? 'border-gray-600' : 'border-gray-300',
      accent: isDark ? 'border-blue-500' : 'border-blue-500',
    },
    bg: {
      primary: isDark ? 'bg-gray-900' : 'bg-white',
      secondary: isDark ? 'bg-gray-800' : 'bg-gray-50',
      tertiary: isDark ? 'bg-gray-700' : 'bg-gray-100',
      overlay: isDark ? 'bg-gray-800/95' : 'bg-white/95',
    },
    text: {
      primary: isDark ? 'text-gray-100' : 'text-gray-900',
      secondary: isDark ? 'text-gray-300' : 'text-gray-600',
      tertiary: isDark ? 'text-gray-400' : 'text-gray-500',
      inverse: isDark ? 'text-gray-900' : 'text-white',
    },
    state: {
      hover: isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
      active: isDark ? 'bg-gray-700' : 'bg-gray-200',
    }
  }), [isDark]);

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
            />

            
            {/*<Input
              label="Saldo Inicial"
              name="balance"
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
              disabled={submitting}
              variant="outlined"
              size="sm"
            />*/}

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
              />

              <Select
                label="Moeda"
                name="currency"
                value={formData.currency}
                onChange={(value) => setFormData({ ...formData, currency: String(value) })}
                options={currencyOptions}
                disabled={submitting}
                size="sm"
              />
            </div>

            {/* Seletor de Cores - Mobile Optimized */}
            <div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap items-center justify-start sm:justify-start">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                  Cor
                </label>
                {/*{COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex-shrink-0 ${
                      formData.color === color 
                        ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 scale-110' 
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    disabled={submitting}
                    title={color}
                  />
                ))}*/}

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

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 transition-colors"
                  disabled={submitting}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Conta ativa
                </span>
              </label>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                formData.isActive 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {formData.isActive ? 'Ativa' : 'Inativa'}
              </div>
            </div>
          </div>

          {/* Coluna da pré-visualização */}
          <div className="xl:sticky xl:top-0 order-last xl:order-last">
            {/*<div className="mb-4 xl:mb-0">
              <AccountPreview formData={formData} />
            </div>*/}
            
            {/* Ações Mobile - Aparece apenas em mobile abaixo da preview */}
            {/*<div className="xl:hidden mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  isLoading={submitting}
                  icon={<FaPlus size={14} />}
                  disabled={submitting}
                >
                  {isEditing ? 'Atualizar' : 'Adicionar'} Conta
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={onCancel}
                  disabled={submitting}
                  fullWidth
                >
                  Cancelar
                </Button>
              </div>
            </div>*/}
          </div>
        </div>
      </div>

      {/* Ações Desktop - Aparece apenas em desktop */}
      <div className="p-4 lg:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
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
