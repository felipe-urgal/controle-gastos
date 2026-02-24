'use client';

import { useRouter } from "next/navigation";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSave, FaTimes, FaInfoCircle, FaSpinner } from 'react-icons/fa';
import { accountService } from '@/app/services';
import { AccountModel, AccountType } from '@/app/types/account';
import { Input, Select, ColorIconSelector, ActiveToggle, Button, Alert } from '@/app/components';

interface AccountFormProps {
  account?: AccountModel | null;
  isEditing: boolean;
};

const accountTypeOptions = [
  { value: 'CREDIT_DEBIT', label: 'Conta Corrente' },
  { value: 'INVESTMENT', label: 'Investimento' },
];

const currencyOptions = [
  { value: 'BRL', label: 'R$ Real Brasileiro' },
  { value: 'USD', label: 'US$ Dólar Americano' },
  { value: 'EUR', label: '€ Euro' },
];

const initialFormData = {
  name: '',
  type: 'CREDIT_DEBIT' as AccountType,
  currency: 'BRL',
  color: '#7C3AED',
  icon: 'wallet',
  description: '',
  isActive: true,
};

export default function AccountForm({ account, isEditing }: AccountFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState(initialFormData);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && account) {
      setFormData({
        name: account.name ?? '',
        type: account.type,
        currency: account.currency,
        color: account.color ?? '#7C3AED',
        icon: account.icon ?? 'wallet',
        description: account.description ?? '',
        isActive: account.isActive,
      });
    } else {
      setFormData(initialFormData);
    }
  }, [account, isEditing]);

  function handleRedirect() {
    if (isEditing && account?.id) {
      router.replace(`/contas/show/${account.id}`);
    } else {
      router.replace('/contas');
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        ...formData,
        description: formData.description || null,
      };

      if (isEditing && account) {
        await accountService.updateAccount(account.id, payload);
      } else {
        await accountService.createAccount(payload);
      }

      handleRedirect();

    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.error?.message ||
        err?.data?.error?.message ||
        err?.message;

      setSubmitError(apiMessage || 'Erro ao salvar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="relative flex flex-col gap-3 bg-white/5 rounded-2xl border border-white/5 p-4">
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

      <Input
        label="Nome da Conta"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        disabled={loading}
        required
        icon={<FaInfoCircle />}
      />

      <Select
        label="Tipo de Conta"
        value={formData.type}
        onChange={(v) => setFormData({ ...formData, type: v as AccountType })}
        options={accountTypeOptions}
        disabled={loading}
      />

      <Select
        label="Moeda"
        value={formData.currency}
        onChange={(v) => setFormData({ ...formData, currency: String(v) })}
        options={currencyOptions}
        disabled={loading}
      />

      <ColorIconSelector
        color={formData.color}
        icon={formData.icon}
        onColorChange={(color) => setFormData({ ...formData, color })}
        onIconChange={(icon) => setFormData({ ...formData, icon })}
        disabled={loading}
      />

      <Input
        label="Descrição"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        disabled={loading}
        multiline
        rows={3}
      />

      {isEditing && (
        <ActiveToggle
          isActive={formData.isActive}
          onToggle={(isActive) => setFormData({ ...formData, isActive })}
          disabled={loading}
          label="Conta ativa"
        />
      )}

      <div className="flex gap-3 mt-1 justify-between">
        <Button
          type="button"
          onClick={handleRedirect}
          variant="secondary"
          disabled={loading}
          icon={<FaTimes />}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={loading}
          icon={loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
        >
          {loading
            ? (isEditing ? 'Salvando...' : 'Criando...')
            : (isEditing ? 'Salvar Alterações' : 'Criar Conta')
          }
        </Button>
      </div>
    </form>
  );
};
