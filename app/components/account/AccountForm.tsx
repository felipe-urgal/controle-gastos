'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

import { accountService } from '@/app/services';
import { useAuth } from '@/app/context';
import { AccountModel, AccountType } from '@/app/types/account';

import {
  Input,
  Select,
  ColorIconSelector,
  ActiveToggle,
  Button,
  Alert
} from '@/app/components';

import { useFormManager, useCurrencyFormatter } from '@/app/hook';

interface AccountFormProps {
  account?: AccountModel | null;
  isEditing: boolean;
  onSubmitSuccess: (message: string) => void;
  onCancel: () => void;
  submitting?: boolean;
}

const accountTypeOptions = [
  { value: 'CREDIT_DEBIT', label: '💳 Conta Corrente', description: 'Para uso diário, cartões, etc.' },
  { value: 'INVESTMENT', label: '📈 Investimento', description: 'Ações, renda fixa, fundos' },
];

const currencyOptions = [
  { value: 'BRL', label: 'R$ Real Brasileiro', symbol: 'R$' },
  { value: 'USD', label: 'US$ Dólar Americano', symbol: '$' },
  { value: 'EUR', label: '€ Euro', symbol: '€' },
];

const initialFormData = {
  name: '',
  balance: 0,
  type: 'CREDIT_DEBIT' as AccountType,
  currency: 'BRL',
  color: '#7C3AED',
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
  submitting: externalSubmitting = false,
}: AccountFormProps) {
  const { user } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currencyFormatter = useCurrencyFormatter({
    initialValue: 'R$ 0,00'
  });

  const formManager = useFormManager({
    initialData: initialFormData,
    editingItem: account,
    isEditing,
    onSubmit: async (data) => {
      setSubmitError(null);
      try {
        const payload = {
          ...data,
          description: data.description || null,
          userId: user!.id
        };

        if (isEditing && account) {
          return await accountService.updateAccount({
            ...account,
            ...payload
          });
        }

        return await accountService.createAccount(payload);
      } catch (err: any) {
        setSubmitError(err.message || 'Erro ao salvar conta');
        throw err;
      }
    },
    onSuccess: (message) => {
      onSubmitSuccess(message || (isEditing ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!'));
    },
    userId: user?.id
  });

  const handleBalanceChange = (value: string) => {
    currencyFormatter.handleCurrencyChange(value);
    const cents = currencyFormatter.formatCurrencyToCents(value);
    formManager.setFormData({ balance: cents });
  };

  useEffect(() => {
    if (account && isEditing) {
      const formatted = currencyFormatter.formatCentsToCurrency(account.balance);
      currencyFormatter.setDisplayValue(formatted);
    }
  }, [account, isEditing, currencyFormatter]);

  const isFormValid = () => {
    return formManager.formData.name.trim().length > 0;
  };

  const selectedCurrency = currencyOptions.find(c => c.value === formManager.formData.currency);

  return (
    <form onSubmit={formManager.handleSubmit}>
      {/* Error Alert */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert
              variant="error"
              message={submitError}
              onClose={() => setSubmitError(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seção 1: Informações Básicas */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-purple-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Informações Básicas
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Input
            label="Nome da Conta"
            value={formManager.formData.name}
            onChange={(e) => formManager.setFormData({ name: e.target.value })}
            placeholder="Ex: Nubank, Carteira, etc."
            disabled={externalSubmitting}
            required
            error={formManager.formData.name.trim().length === 0 ? 'Nome é obrigatório' : undefined}
            icon={<FaInfoCircle />}
          />

          <Input
            label={`Saldo Inicial (${selectedCurrency?.symbol})`}
            value={currencyFormatter.displayValue}
            onChange={handleBalanceChange}
            disabled={externalSubmitting}
            placeholder="R$ 0,00"
          />
        </div>
      </div>

      {/* Seção 2: Tipo e Moeda */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6 mt-6">
          <div className="w-1 h-6 bg-indigo-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Classificação
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Select
            label="Tipo de Conta"
            value={formManager.formData.type}
            onChange={(v) => formManager.setFormData({ type: v as AccountType })}
            options={accountTypeOptions}
            disabled={externalSubmitting}
          />

          <Select
            label="Moeda"
            value={formManager.formData.currency}
            onChange={(v) => formManager.setFormData({ currency: String(v) })}
            options={currencyOptions}
            disabled={externalSubmitting}
          />
        </div>
      </div>

      {/* Seção 3: Personalização */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6 mt-6">
          <div className="w-1 h-6 bg-pink-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Personalização
          </h3>
        </div>

        <ColorIconSelector
          color={formManager.formData.color}
          icon={formManager.formData.icon}
          onColorChange={(color) => formManager.setFormData({ color })}
          onIconChange={(icon) => formManager.setFormData({ icon })}
          disabled={externalSubmitting}
        />

        <Input
          label="Descrição (opcional)"
          value={formManager.formData.description}
          onChange={(e) => formManager.setFormData({ description: e.target.value })}
          disabled={externalSubmitting}
          placeholder="Uma breve descrição da conta..."
          multiline
          rows={3}
        />

        <ActiveToggle
          isActive={formManager.formData.isActive}
          onToggle={(isActive) => formManager.setFormData({ isActive })}
          disabled={externalSubmitting}
          label="Conta ativa"
        />
      </div>

      {/* Preview Card (opcional) */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10">
            <h4 className="text-sm font-medium text-slate-400 mb-4">Pré-visualização</h4>
            
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: formManager.formData.color }}
              >
                <span>💰</span>
              </div>
              
              <div>
                <p className="font-medium text-white">{formManager.formData.name || 'Nome da Conta'}</p>
                <p className="text-sm text-slate-400">
                  {accountTypeOptions.find(t => t.value === formManager.formData.type)?.label}
                </p>
              </div>
              
              <div className="ml-auto text-right">
                <p className="text-sm text-slate-400">Saldo</p>
                <p className="text-lg font-bold" style={{ color: formManager.formData.color }}>
                  {currencyFormatter.displayValue || 'R$ 0,00'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-white/10">
        <Button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          variant="ghost"
          size="md"
          className="order-2 sm:order-1"
        >
          {showPreview ? 'Ocultar preview' : 'Mostrar preview'}
        </Button>

        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          size="md"
          disabled={externalSubmitting}
          className="order-3 sm:order-2"
          icon={<FaTimes />}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={externalSubmitting || !isFormValid()}
          size="lg"
          className="order-1 sm:order-3
                     bg-gradient-to-r from-purple-600 to-indigo-600
                     hover:from-purple-700 hover:to-indigo-700
                     text-white font-semibold shadow-lg"
          icon={<FaSave />}
          loading={externalSubmitting}
        >
          {externalSubmitting 
            ? (isEditing ? 'Salvando...' : 'Criando...') 
            : (isEditing ? 'Salvar Alterações' : 'Criar Conta')
          }
        </Button>
      </div>

      {/* Validação em tempo real */}
      {!isFormValid() && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-400 flex items-center gap-2"
        >
          <FaExclamationTriangle size={12} />
          Preencha o nome da conta para continuar
        </motion.p>
      )}
    </form>
  );
}
