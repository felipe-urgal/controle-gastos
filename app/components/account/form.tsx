'use client';

// importing hooks
import { useRouter } from "next/navigation";
import { useState, useEffect } from 'react';

// importing icons
import { FaInfoCircle } from 'react-icons/fa';

// importing services
import { accountService } from '@/app/services/accountService';

// importing types
import { AccountModel, AccountType } from '@/app/types/account';

// importing components
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import ColorIconSelector from '@/app/components/ui/ColorIconSelector';
import ActiveToggle from '@/app/components/ui/ActiveToggle';
import FormContainer from "@/app/components/ui/FormContainer";
import FormActions from "@/app/components/ui/FormActions";

// interface
interface AccountFormProps {
  account?: AccountModel | null;
  isEditing: boolean;
};


// const
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
        await accountService.update(account.id, payload);
      } else {
        await accountService.create(payload);
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
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-4"
    >
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

      <FormActions
        isEditing={isEditing}
        loading={loading}
        onCancel={handleRedirect}
        createLabel="Criar Conta"
        submitLabel="Salvar Alterações"
      />
    </FormContainer>
  );
};
