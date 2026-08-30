'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaInfoCircle, FaPalette } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import { ActiveToggle, ColorIconSelector, Input, RadioGroup } from '@/app/components/ui';
import {
  accountTypeOptions,
  currencyOptions,
  initialFormData,
} from '@/app/lib/constants/account.constants';
import { AccountFormProps } from '@/app/lib/interface/accounts.interface';
import { accountService } from '@/app/services/account-service';
import { AccountType } from '@/app/types/account';

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
      return;
    }

    setFormData(initialFormData);
  }, [account, isEditing]);

  function handleRedirect() {
    if (isEditing && account?.id) {
      router.replace(`/contas/show/${account.id}`);
    } else {
      router.replace('/contas');
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.error?.message ||
        error?.data?.error?.message ||
        error?.message;

      setSubmitError(apiMessage || 'Erro ao salvar conta');
    } finally {
      setIsSubmitting(false);
    }
  }

  const loading = isSubmitting;

  return (
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-2 gap-0"
    >
      <section className="space-y-4 pb-5" aria-labelledby="account-main-fields">
        <div>
          <h2 id="account-main-fields" className="text-xl font-semibold text-[var(--foreground)]">
            Dados da conta
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Identifique a conta e defina como ela deve ser classificada. O saldo é calculado pelas movimentações concluídas.
          </p>
        </div>

        <Input
          label="Nome da conta"
          value={formData.name}
          onChange={(event) => setFormData({ ...formData, name: event.target.value })}
          disabled={loading}
          required
          icon={<FaInfoCircle />}
          placeholder="Ex.: Conta principal, Reserva, Investimentos"
        />

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <RadioGroup
            required
            label="Tipo de conta"
            name="accountType"
            value={formData.type}
            onChange={(value) => setFormData({ ...formData, type: value as AccountType })}
            options={accountTypeOptions}
            disabled={loading}
          />

          <RadioGroup
            required
            label="Moeda"
            name="currency"
            value={formData.currency}
            onChange={(value) => setFormData({ ...formData, currency: String(value) })}
            options={currencyOptions}
            disabled={loading}
          />
        </div>
      </section>

      <section
        className="space-y-4 border-t border-[var(--border)] py-5"
        aria-labelledby="account-visual-identity"
      >
        <div>
          <h2 id="account-visual-identity" className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)]">
            <FaPalette className="text-[var(--primary)]" aria-hidden="true" />
            Identidade visual
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Cor e ícone ajudam a reconhecer a conta rapidamente sem substituir nome, tipo ou status.
          </p>
        </div>

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
          onChange={(event) => setFormData({ ...formData, description: event.target.value })}
          disabled={loading}
          multiline
          rows={3}
          placeholder="Adicione um contexto opcional para esta conta"
        />
      </section>

      {isEditing && (
        <section
          className="border-t border-[var(--border)] py-5"
          aria-labelledby="account-status-heading"
        >
          <div className="mb-4">
            <h2 id="account-status-heading" className="text-xl font-semibold text-[var(--foreground)]">
              Status da conta
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
              Contas inativas permanecem no histórico, mas ficam visualmente diferenciadas nas listagens.
            </p>
          </div>

          <ActiveToggle
            isActive={formData.isActive}
            onToggle={(isActive) => setFormData({ ...formData, isActive })}
            disabled={loading}
            label="Conta ativa"
          />
        </section>
      )}

      <FormActions
        isEditing={isEditing}
        loading={loading}
        onCancel={handleRedirect}
        createLabel="Criar conta"
        submitLabel="Salvar alterações"
      />
    </FormContainer>
  );
}
