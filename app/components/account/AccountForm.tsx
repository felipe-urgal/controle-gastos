'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaExclamationTriangle,
  FaSpinner
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formManager = useFormManager({
    initialData: initialFormData,
    editingItem: account,
    isEditing,
    onSubmit: async (data) => {
      setSubmitError(null);
      setTouched(true);
      setIsSubmitting(true);
      
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
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (message) => {
      onSubmitSuccess(message || (isEditing ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!'));
    },
    userId: user?.id
  });

  const {
    displayValue,
    setDisplayValue,
    formatCentsToCurrency
  } = useCurrencyFormatter({
    initialValue: 'R$ 0,00',
    currency: formManager.formData.currency
  });

  const handleBalanceChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const raw = e.target.value.replace(/\D/g, '');

    const cents = Number(raw || 0);

    formManager.setFormData({ balance: cents });

    const formatted = formatCentsToCurrency(
      formManager.formData.balance
    );

    setDisplayValue(formatted);
  };

  useEffect(() => {
    if (!isEditing) return;

    const formatted = formatCentsToCurrency(
      formManager.formData.balance
    );

    setDisplayValue(formatted);

  }, [
    isEditing,
    formManager.formData.balance,
    formatCentsToCurrency,
    setDisplayValue
  ]);

  const isFormValid = () => {
    return formManager.formData.name.trim().length > 0;
  };

  const selectedCurrency = currencyOptions.find(c => c.value === formManager.formData.currency);

  const handleNameBlur = () => {
    if (formManager.formData.name.trim().length > 0) {
      setTouched(false);
    }
  };

  // Determina se está em loading
  const loading = isSubmitting || externalSubmitting;

  return (
    <form onSubmit={formManager.handleSubmit} className="relative">
      {/* Error Alert */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
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
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-purple-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Informações Básicas
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome da Conta"
            value={formManager.formData.name}
            onChange={(e) => formManager.setFormData({ name: e.target.value })}
            onBlur={handleNameBlur}
            placeholder="Ex: Nubank, Carteira, etc."
            disabled={loading}
            required
            error={touched && !formManager.formData.name.trim() ? 'Nome é obrigatório' : undefined}
            icon={<FaInfoCircle />}
            className="w-full"
          />

          <Input
            label={`Saldo Inicial (${selectedCurrency?.symbol})`}
            value={displayValue}
            onChange={handleBalanceChange} // ← Agora passa o evento corretamente
            disabled={loading}
            placeholder="R$ 0,00"
            className="w-full"
          />
        </div>
      </div>

      {/* Seção 2: Tipo e Moeda */}
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-indigo-500 rounded-full" />
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Classificação
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Tipo de Conta"
            value={formManager.formData.type}
            onChange={(v) => formManager.setFormData({ type: v as AccountType })}
            options={accountTypeOptions}
            disabled={loading}
            className="w-full"
          />

          <Select
            label="Moeda"
            value={formManager.formData.currency}
            onChange={(v) => formManager.setFormData({ currency: String(v) })}
            options={currencyOptions}
            disabled={loading}
            className="w-full"
          />
        </div>
      </div>

      {/* Seção 3: Personalização */}
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
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
          disabled={loading}
        />

        <Input
          label="Descrição (opcional)"
          value={formManager.formData.description}
          onChange={(e) => formManager.setFormData({ description: e.target.value })}
          disabled={loading}
          placeholder="Uma breve descrição da conta..."
          multiline
          rows={3}
          className="w-full"
        />

        <ActiveToggle
          isActive={formManager.formData.isActive}
          onToggle={(isActive) => formManager.setFormData({ isActive })}
          disabled={loading}
          label="Conta ativa"
        />
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/10">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          size="md"
          disabled={loading}
          className="w-full sm:w-auto order-3 sm:order-2"
          icon={<FaTimes />}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={loading || !isFormValid()}
          size="lg"
          className="w-full sm:w-auto order-1 sm:order-3
                     bg-gradient-to-r from-purple-600 to-indigo-600
                     hover:from-purple-700 hover:to-indigo-700
                     text-white font-semibold shadow-lg"
          icon={loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
          isLoading={loading}
        >
          {loading 
            ? (isEditing ? 'Salvando...' : 'Criando...') 
            : (isEditing ? 'Salvar Alterações' : 'Criar Conta')
          }
        </Button>
      </div>

      {/* Validação em tempo real */}
      <AnimatePresence>
        {touched && !isFormValid() && !loading && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-400 flex items-center gap-2 mt-4"
          >
            <FaExclamationTriangle size={12} />
            Preencha o nome da conta para continuar
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}
