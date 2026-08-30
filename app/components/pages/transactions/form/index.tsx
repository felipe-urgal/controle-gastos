'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaCalendarAlt, FaRedoAlt } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
import { Button, Input, RadioGroup, Select } from '@/app/components/ui';
import { statusOptions } from '@/app/lib/constants/transaction.constants';
import { useCurrencyFormatter } from '@/app/lib/currency/format-currency';
import { FormData } from '@/app/lib/interface/transaction.interface';
import {
  formatIsoLogicalDate,
  formatPtBrLogicalDate,
  generateMonthlyDates,
  MAX_MONTHLY_OCCURRENCES,
  parseIsoLogicalDate,
} from '@/app/lib/transactions/monthly-recurrence';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import { AccountModel } from '@/app/types/account';
import { CategoryModel } from '@/app/types/category';
import { TransactionDTO, TransactionStatus } from '@/app/types/transaction';

interface TransactionFormProps {
  transaction?: any;
  isEditing: boolean;
  initialDate?: Date;
  initialValues?: FormData;
  onSuccess?: (savedTransaction?: any) => void;
  onCancelOverride?: () => void;
}

type RecurrenceMode = 'count' | 'endDate';

export default function TransactionForm({
  transaction,
  isEditing,
  initialDate,
  initialValues,
  onSuccess,
  onCancelOverride,
}: TransactionFormProps) {
  const router = useRouter();
  const baseDate = initialDate ?? new Date();

  const [formData, setFormData] = useState<FormData>({
    amount: 0,
    month: baseDate.getMonth() + 1,
    year: baseDate.getFullYear(),
    day: baseDate.getDate(),
    description: '',
    status: 'COMPLETED',
    accountId: '',
    categoryId: '',
  });
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('count');
  const [occurrenceCount, setOccurrenceCount] = useState(12);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((account) => account.id === formData.accountId);
  const { displayValue, setDisplayValue, formatCentsToCurrency } = useCurrencyFormatter({
    initialValue: 'R$ 0,00',
    currency: selectedAccount?.currency || 'BRL',
  });

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues);
      return;
    }

    if (isEditing && transaction) {
      setFormData({
        amount: transaction.amount,
        month: transaction.month,
        year: transaction.year,
        day: transaction.day,
        description: transaction.description || '',
        status: transaction.status,
        accountId: transaction.account?.id || '',
        categoryId: transaction.category?.id || '',
      });
      return;
    }

    if (!isEditing && initialDate) {
      setFormData((previous) => ({
        ...previous,
        day: initialDate.getDate(),
        month: initialDate.getMonth() + 1,
        year: initialDate.getFullYear(),
      }));
    }
  }, [isEditing, transaction, initialDate, initialValues]);

  useEffect(() => {
    async function loadData() {
      try {
        const [accountsResponse, categoriesResponse] = await Promise.all([
          accountService.getAll(),
          categoryService.getAll(),
        ]);
        setAccounts(accountsResponse.data?.items || []);
        setCategories(categoriesResponse.data?.items || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    setDisplayValue(formatCentsToCurrency(formData.amount));
  }, [formData.amount, formatCentsToCurrency, setDisplayValue]);

  const recurrencePreview = useMemo(() => {
    if (!repeatMonthly || isEditing) {
      return { dates: [], error: null as string | null };
    }

    const start = {
      year: formData.year,
      month: formData.month,
      day: formData.day,
    };

    try {
      if (recurrenceMode === 'count') {
        return {
          dates: generateMonthlyDates(start, {
            mode: 'count',
            occurrences: occurrenceCount,
          }),
          error: null,
        };
      }

      const endDate = parseIsoLogicalDate(recurrenceEndDate);
      if (!endDate) {
        return { dates: [], error: 'Informe uma data final válida' };
      }

      return {
        dates: generateMonthlyDates(start, { mode: 'endDate', endDate }),
        error: null,
      };
    } catch (error) {
      return {
        dates: [],
        error: error instanceof Error ? error.message : 'Recorrência inválida',
      };
    }
  }, [
    repeatMonthly,
    isEditing,
    formData.year,
    formData.month,
    formData.day,
    recurrenceMode,
    occurrenceCount,
    recurrenceEndDate,
  ]);

  function handleRedirect(savedTransaction?: TransactionDTO | null) {
    if (onSuccess) {
      onSuccess(savedTransaction);
      return;
    }

    if (isEditing && transaction?.id) {
      router.replace(`/transacoes/show/${transaction.id}`);
    } else {
      router.replace('/transacoes');
    }
  }

  function handleCancel() {
    if (onCancelOverride) {
      onCancelOverride();
      return;
    }

    handleRedirect();
  }

  function moveCursorToEnd() {
    requestAnimationFrame(() => {
      const input = amountInputRef.current;
      if (!input) return;
      const length = input.value.length;
      input.setSelectionRange(length, length);
    });
  }

  const handleAmountChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const raw = event.target.value.replace(/\D/g, '');
    const cents = Number(raw || 0);
    setFormData((previous) => ({ ...previous, amount: cents }));
    setDisplayValue(formatCentsToCurrency(cents));
    moveCursorToEnd();
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedCategory = categories.find(
        (category) => category.id === formData.categoryId,
      );

      if (!selectedCategory) {
        throw new Error('Categoria inválida');
      }

      const payload = {
        ...formData,
        type: selectedCategory.type,
        description: formData.description || '',
      };

      let savedTransaction: TransactionDTO | null = null;

      if (!isEditing && repeatMonthly) {
        if (recurrencePreview.error || recurrencePreview.dates.length < 2) {
          throw new Error(recurrencePreview.error || 'Recorrência inválida');
        }

        const recurrence =
          recurrenceMode === 'count'
            ? { mode: 'count' as const, occurrences: occurrenceCount }
            : { mode: 'endDate' as const, endDate: recurrenceEndDate };

        const response = await transactionService.createMonthlyRecurring({
          transaction: payload,
          recurrence,
        });
        savedTransaction = response.data.firstOccurrence;
      } else if (isEditing && transaction) {
        const response = await transactionService.update(transaction.id, payload);
        savedTransaction = response.data;
      } else {
        const response = await transactionService.create(payload);
        savedTransaction = response.data;
      }

      handleRedirect(savedTransaction);
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.message ||
        'Erro ao salvar transação';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const loading = isSubmitting || loadingData;
  const accountOptions = accounts
    .filter((account) => account.isActive)
    .map((account) => ({ value: account.id, label: account.name }));
  const categoryOptions = [
    {
      label: 'Receitas',
      options: categories
        .filter((category) => category.type === 'INCOME')
        .map((category) => ({ value: category.id, label: category.name })),
    },
    {
      label: 'Despesas',
      options: categories
        .filter((category) => category.type === 'EXPENSE')
        .map((category) => ({ value: category.id, label: category.name })),
    },
  ];
  const isFixedDate = Boolean(initialDate);
  const firstRecurrenceDate = recurrencePreview.dates[0];
  const lastRecurrenceDate = recurrencePreview.dates.at(-1);

  return (
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-2 gap-0"
    >
      <section className="space-y-4 pb-5" aria-labelledby="transaction-main-fields">
        <div>
          <h2 id="transaction-main-fields" className="text-xl font-semibold text-[var(--foreground)]">
            Dados da transação
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            Defina onde o lançamento será registrado e como ele deve aparecer na sua movimentação.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Conta"
            value={formData.accountId}
            onChange={(value) => setFormData({ ...formData, accountId: String(value) })}
            options={accountOptions}
            disabled={loading}
            required
            placeholder="Selecione uma conta"
          />

          <Select
            label="Categoria"
            value={formData.categoryId}
            onChange={(value) => setFormData({ ...formData, categoryId: String(value) })}
            options={categoryOptions}
            disabled={loading}
            required
            grouped
            placeholder="Selecione uma categoria"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(180px,.8fr)_minmax(0,1.7fr)]">
          <Input
            ref={amountInputRef}
            label="Valor"
            value={displayValue}
            onChange={handleAmountChange}
            onFocus={moveCursorToEnd}
            onClick={moveCursorToEnd}
            disabled={loading}
            required
            inputMode="numeric"
          />

          <Input
            label="Descrição"
            value={formData.description}
            onChange={(event) =>
              setFormData({ ...formData, description: event.target.value })
            }
            disabled={loading}
            required
            placeholder="Ex.: Supermercado, salário, aluguel..."
          />
        </div>
      </section>

      <section
        className="space-y-4 border-t border-[var(--border)] py-5"
        aria-labelledby="transaction-date-status"
      >
        <div>
          <h2 id="transaction-date-status" className="text-xl font-semibold text-[var(--foreground)]">
            Data e status
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
            O status determina quando a movimentação participa dos cálculos financeiros.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3">
            {!isFixedDate && (
              <>
                <Input
                  label="Data"
                  type="date"
                  value={formatIsoLogicalDate({
                    year: formData.year,
                    month: formData.month,
                    day: formData.day,
                  })}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) return;
                    const [year, month, day] = value.split('-').map(Number);
                    setFormData({ ...formData, day, month, year });
                  }}
                  disabled={loading}
                  required
                />

                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    const now = new Date();
                    setFormData({
                      ...formData,
                      day: now.getDate(),
                      month: now.getMonth() + 1,
                      year: now.getFullYear(),
                    });
                  }}
                  disabled={loading}
                  icon={<FaCalendarAlt />}
                  className="w-auto self-start !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-transparent"
                >
                  Usar data atual
                </Button>
              </>
            )}

            {isFixedDate && (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                <p className="text-sm font-medium text-[var(--text-muted)]">Data selecionada</p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                  {formatPtBrLogicalDate({
                    year: formData.year,
                    month: formData.month,
                    day: formData.day,
                  })}
                </p>
              </div>
            )}
          </div>

          <RadioGroup
            required
            name="status"
            label="Status"
            value={formData.status}
            onChange={(value) =>
              setFormData({ ...formData, status: value as TransactionStatus })
            }
            options={statusOptions}
            disabled={loading}
          />
        </div>
      </section>

      {!isEditing && (
        <section
          className="border-t border-[var(--border)] py-5"
          aria-labelledby="transaction-recurrence-heading"
        >
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={repeatMonthly}
                onChange={(event) => setRepeatMonthly(event.target.checked)}
                disabled={loading}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-[var(--border-strong)] accent-[var(--primary)]"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                  <FaRedoAlt className="text-[var(--primary)]" aria-hidden="true" />
                  <span id="transaction-recurrence-heading">Repetir mensalmente</span>
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">
                  Crie agora uma série finita de lançamentos. Nenhuma nova ocorrência é gerada ao abrir páginas.
                </span>
              </span>
            </label>

            {repeatMonthly && (
              <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
                <RadioGroup
                  name="recurrence-mode"
                  label="Terminar recorrência por"
                  value={recurrenceMode}
                  onChange={(value) => setRecurrenceMode(value as RecurrenceMode)}
                  disabled={loading}
                  options={[
                    { value: 'count', label: 'Quantidade' },
                    { value: 'endDate', label: 'Data final' },
                  ]}
                />

                <div className="max-w-md">
                  {recurrenceMode === 'count' ? (
                    <Input
                      label="Quantidade de ocorrências"
                      type="number"
                      min={2}
                      max={MAX_MONTHLY_OCCURRENCES}
                      value={occurrenceCount}
                      onChange={(event) => setOccurrenceCount(Number(event.target.value))}
                      disabled={loading}
                      required
                    />
                  ) : (
                    <Input
                      label="Data final"
                      type="date"
                      value={recurrenceEndDate}
                      min={formatIsoLogicalDate({
                        year: formData.year,
                        month: formData.month,
                        day: formData.day,
                      })}
                      onChange={(event) => setRecurrenceEndDate(event.target.value)}
                      disabled={loading}
                      required
                    />
                  )}
                </div>

                <div
                  className={`rounded-[var(--radius-md)] border p-4 text-sm leading-relaxed ${
                    recurrencePreview.error
                      ? 'border-[var(--danger)]/35 bg-[var(--danger-subtle)] text-[var(--expense)]'
                      : 'border-[var(--primary)]/30 bg-[var(--primary-subtle)] text-[var(--foreground)]'
                  }`}
                  role={recurrencePreview.error ? 'alert' : 'status'}
                >
                  {recurrencePreview.error ? (
                    recurrencePreview.error
                  ) : firstRecurrenceDate && lastRecurrenceDate ? (
                    <>
                      <strong>{recurrencePreview.dates.length} ocorrências</strong> de{' '}
                      {formatPtBrLogicalDate(firstRecurrenceDate)} até{' '}
                      {formatPtBrLogicalDate(lastRecurrenceDate)}. A primeira mantém o status escolhido; as{' '}
                      {recurrencePreview.dates.length - 1} seguintes serão criadas como pendentes.
                    </>
                  ) : (
                    'Configure a recorrência para visualizar o período antes de confirmar.'
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <FormActions
        isEditing={isEditing}
        loading={loading}
        onCancel={handleCancel}
        createLabel={repeatMonthly ? 'Criar recorrência' : 'Criar transação'}
        submitLabel="Salvar alterações"
      />
    </FormContainer>
  );
}
