'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaArrowLeft } from 'react-icons/fa';

import { accountService } from '@/app/services';
import { useAuth } from '@/app/context';
import { AccountModel, AccountType } from '@/app/types/account';

import {
  Input,
  Select,
  ColorIconSelector,
  ActiveToggle,
  Button
} from '@/app/components';

import { useFormManager, useCurrencyFormatter } from '@/app/hook';

interface AccountFormProps {
  account?: AccountModel | null;
  isEditing: boolean;
  onSubmitSuccess: (message: string) => void;
  onCancel: () => void;
  submitting: boolean;
}

const accountTypeOptions = [
  { value: 'CREDIT_DEBIT', label: 'Crédito/Débito' },
  { value: 'INVESTMENT', label: 'Investimento' },
];

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
    },
    onSuccess: onSubmitSuccess,
    userId: user?.id
  });

  const handleBalanceChange = (value: string) => {
    currencyFormatter.handleCurrencyChange(value);
    const cents = currencyFormatter.formatCurrencyToCents(value);
    formManager.setFormData({ balance: cents });
  };

  useEffect(() => {
    if (account && isEditing) {
      const formatted =
        currencyFormatter.formatCentsToCurrency(account.balance);
      currencyFormatter.setDisplayValue(formatted);
    }
  }, [account, isEditing]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        relative
      "
    >

      {/* HEADER */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-3xl font-bold">
            {isEditing ? 'Editar Conta' : 'Nova Conta'}
          </h2>
          <p className="text-slate-400 mt-2">
            Configure os detalhes da sua conta financeira
          </p>
        </div>

        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <FaArrowLeft />
          Voltar
        </button>
      </div>

      <form
        onSubmit={formManager.handleSubmit}
        className="space-y-12"
      >

        {/* BLOCO 1 */}
        <div className="grid md:grid-cols-2 gap-8">
          <Input
            label="Nome da Conta"
            value={formManager.formData.name}
            onChange={(e) =>
              formManager.setFormData({ name: e.target.value })
            }
            placeholder="Ex: Nubank"
            disabled={submitting}
          />

          <Input
            label="Saldo Inicial"
            value={currencyFormatter.displayValue}
            onChange={handleBalanceChange}
            disabled={submitting}
          />
        </div>

        {/* BLOCO 2 */}
        <div className="grid md:grid-cols-2 gap-8">
          <Select
            label="Tipo"
            value={formManager.formData.type}
            onChange={(v) =>
              formManager.setFormData({ type: v as AccountType })
            }
            options={accountTypeOptions}
            disabled={submitting}
          />

          <Select
            label="Moeda"
            value={formManager.formData.currency}
            onChange={(v) =>
              formManager.setFormData({ currency: String(v) })
            }
            options={currencyOptions}
            disabled={submitting}
          />
        </div>

        {/* PERSONALIZAÇÃO */}
        <div className="space-y-6">
          <h3 className="text-xs uppercase tracking-widest text-slate-500">
            Personalização
          </h3>

          <ColorIconSelector
            color={formManager.formData.color}
            icon={formManager.formData.icon}
            onColorChange={(color) =>
              formManager.setFormData({ color })
            }
            onIconChange={(icon) =>
              formManager.setFormData({ icon })
            }
            disabled={submitting}
          />

          <Input
            label="Descrição"
            value={formManager.formData.description}
            onChange={(e) =>
              formManager.setFormData({
                description: e.target.value
              })
            }
            disabled={submitting}
          />

          <ActiveToggle
            isActive={formManager.formData.isActive}
            onToggle={(isActive) =>
              formManager.setFormData({ isActive })
            }
            disabled={submitting}
            label="Conta ativa"
          />
        </div>

        {/* BOTÕES */}
        <div className="flex justify-end gap-4 pt-8 border-t border-white/10">

          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl
                       bg-gradient-to-r from-purple-600 to-indigo-600
                       text-white font-semibold shadow-lg"
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Conta'}
          </Button>

        </div>

      </form>
    </motion.div>
  );
}
