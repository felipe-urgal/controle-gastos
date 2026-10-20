'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { initialFormData } from '@/app/lib/constants/account.constants';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import type { AccountFormProps } from '@/app/lib/interface/accounts.interface';
import { accountService } from '@/app/services/account-service';

/**
 * Estado, validação e envio do formulário de conta, independentes da apresentação
 * (wizard mobile ou formulário desktop).
 */
export function useAccountForm({ account, isEditing }: AccountFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(() =>
    isEditing && account
      ? {
          name: account.name ?? '',
          type: account.type,
          currency: account.currency,
          color: account.color ?? '#7C3AED',
          icon: account.icon ?? 'wallet',
          description: account.description ?? '',
          isActive: account.isActive,
          creditLimit:
            account.creditLimit != null
              ? (account.creditLimit / 100).toFixed(2).replace('.', ',')
              : '',
          statementClosingDay: account.statementClosingDay?.toString() ?? '',
          statementDueDay: account.statementDueDay?.toString() ?? '',
        }
      : initialFormData,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const isCreditCard = formData.type === 'CREDIT_CARD';
      const creditLimit = isCreditCard
        ? parseMoneyInputToCents(formData.creditLimit)
        : null;
      const statementClosingDay = isCreditCard
        ? Number(formData.statementClosingDay)
        : null;
      const statementDueDay = isCreditCard
        ? Number(formData.statementDueDay)
        : null;

      if (
        isCreditCard &&
        (
          creditLimit === null ||
          statementClosingDay === null ||
          !Number.isInteger(statementClosingDay) ||
          statementClosingDay < 1 ||
          statementClosingDay > 31 ||
          statementDueDay === null ||
          !Number.isInteger(statementDueDay) ||
          statementDueDay < 1 ||
          statementDueDay > 31
        )
      ) {
        setSubmitError('Informe limite, fechamento e vencimento válidos para o cartão.');
        return;
      }

      const payload = {
        ...formData,
        description: formData.description || null,
        creditLimit,
        statementClosingDay,
        statementDueDay,
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

  return { formData, setFormData, submitError, setSubmitError, isSubmitting, handleSubmit, handleRedirect };
}
