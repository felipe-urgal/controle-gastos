'use client';

import { useRouter } from 'next/navigation';
import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  FaArrowDown,
  FaArrowRight,
  FaArrowUp,
  FaCheck,
  FaCreditCard,
  FaRedoAlt,
} from 'react-icons/fa';

import { FormContainer } from '@/app/components/forms';
import { Button, Input, RadioGroup, Select } from '@/app/components/ui';
import { statusOptions } from '@/app/lib/constants/transaction.constants';
import { useCurrencyFormatter } from '@/app/lib/currency/format-currency';
import { FormData } from '@/app/lib/interface/transaction.interface';
import { buildInstallmentOccurrences } from '@/app/lib/transactions/installments';
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

type CreationMode = 'single' | 'recurring' | 'installment';
type RecurrenceMode = 'count' | 'endDate';
type CategoryType = 'INCOME' | 'EXPENSE';

function initialTransactionFormData({
  transaction,
  isEditing,
  initialDate,
  initialValues,
}: Pick<
  TransactionFormProps,
  'transaction' | 'isEditing' | 'initialDate' | 'initialValues'
>): FormData {
  if (initialValues) return initialValues;

  if (isEditing && transaction) {
    return {
      amount: transaction.amount,
      month: transaction.month,
      year: transaction.year,
      day: transaction.day,
      description: transaction.description || '',
      status: transaction.status,
      accountId: transaction.account?.id || '',
      categoryId: transaction.category?.id || '',
    };
  }

  const baseDate = initialDate ?? new Date();
  return {
    amount: 0,
    month: baseDate.getMonth() + 1,
    year: baseDate.getFullYear(),
    day: baseDate.getDate(),
    description: '',
    status: 'COMPLETED',
    accountId: '',
    categoryId: '',
  };
}

export default function TransactionForm({
  transaction,
  isEditing,
  initialDate,
  initialValues,
  onSuccess,
  onCancelOverride,
}: TransactionFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(() =>
    initialTransactionFormData({
      transaction,
      isEditing,
      initialDate,
      initialValues,
    }),
  );
  const [creationMode, setCreationMode] = useState<CreationMode>('single');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('count');
  const [occurrenceCount, setOccurrenceCount] = useState(12);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState(2);
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((account) => account.id === formData.accountId);
  const selectedCategory = categories.find((category) => category.id === formData.categoryId);
  const { displayValue, setDisplayValue, formatCentsToCurrency } = useCurrencyFormatter({
    initialValue: 'R$ 0,00',
    currency: selectedAccount?.currency || 'BRL',
  });

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

    void loadData();
  }, []);

  useEffect(() => {
    setDisplayValue(formatCentsToCurrency(formData.amount));
  }, [formData.amount, formatCentsToCurrency, setDisplayValue]);

  useEffect(() => {
    if (selectedCategory) {
      setCategoryFilter(selectedCategory.type as CategoryType);
    }
  }, [selectedCategory]);

  const recurrencePreview = useMemo(() => {
    if (creationMode !== 'recurring' || isEditing) {
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
    creationMode,
    isEditing,
    formData.year,
    formData.month,
    formData.day,
    recurrenceMode,
    occurrenceCount,
    recurrenceEndDate,
  ]);

  const installmentPreview = useMemo(() => {
    if (creationMode !== 'installment' || isEditing) {
      return { occurrences: [], error: null as string | null };
    }

    if (!selectedCategory) {
      return { occurrences: [], error: 'Selecione uma categoria de despesa' };
    }

    if (selectedCategory.type !== 'EXPENSE') {
      return {
        occurrences: [],
        error: 'Parcelamento está disponível apenas para categorias de despesa',
      };
    }

    try {
      return {
        occurrences: buildInstallmentOccurrences({
          totalCents: formData.amount,
          count: installmentCount,
          start: {
            year: formData.year,
            month: formData.month,
            day: formData.day,
          },
          firstStatus: formData.status,
        }),
        error: null,
      };
    } catch (error) {
      return {
        occurrences: [],
        error: error instanceof Error ? error.message : 'Parcelamento inválido',
      };
    }
  }, [
    creationMode,
    isEditing,
    selectedCategory,
    formData.amount,
    formData.year,
    formData.month,
    formData.day,
    formData.status,
    installmentCount,
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

  function handleCategoryType(type: CategoryType) {
    setCategoryFilter(type);
    setFormData((previous) => {
      const currentCategory = categories.find((item) => item.id === previous.categoryId);
      if (!currentCategory || currentCategory.type === type) return previous;
      return { ...previous, categoryId: '' };
    });
  }

  function handleCategoryChange(value: string | number) {
    const categoryId = String(value);
    const category = categories.find((item) => item.id === categoryId);
    if (category) {
      setCategoryFilter(category.type as CategoryType);
    }
    setFormData((previous) => ({ ...previous, categoryId }));
  }

  async function persistTransaction() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const category = categories.find((item) => item.id === formData.categoryId);

      if (!category) {
        throw new Error('Categoria inválida');
      }

      const payload = {
        ...formData,
        type: category.type,
        description: formData.description || '',
      };

      let savedTransaction: TransactionDTO | null = null;

      if (!isEditing && creationMode === 'recurring') {
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
      } else if (!isEditing && creationMode === 'installment') {
        if (category.type !== 'EXPENSE') {
          throw new Error('Parcelamento está disponível apenas para despesas');
        }

        if (installmentPreview.error || installmentPreview.occurrences.length < 2) {
          throw new Error(installmentPreview.error || 'Parcelamento inválido');
        }

        const response = await transactionService.createInstallments({
          transaction: {
            ...payload,
            type: 'EXPENSE' as const,
          },
          installmentCount,
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isEditing && !onSuccess) {
      setReviewOpen(true);
      return;
    }

    void persistTransaction();
  }

  const loading = isSubmitting || loadingData;
  const accountOptions = accounts
    .filter((account) => account.isActive)
    .map((account) => ({ value: account.id, label: account.name }));
  const categoryOptions = [
    {
      type: 'INCOME' as const,
      label: 'Receitas',
      options: categories
        .filter((category) => category.type === 'INCOME')
        .map((category) => ({ value: category.id, label: category.name })),
    },
    {
      type: 'EXPENSE' as const,
      label: 'Despesas',
      options: categories
        .filter((category) => category.type === 'EXPENSE')
        .map((category) => ({ value: category.id, label: category.name })),
    },
  ]
    .filter((group) => !categoryFilter || group.type === categoryFilter)
    .map(({ label, options }) => ({ label, options }));
  const isFixedDate = Boolean(initialDate);
  const firstRecurrenceDate = recurrencePreview.dates[0];
  const lastRecurrenceDate = recurrencePreview.dates.at(-1);
  const firstInstallment = installmentPreview.occurrences[0];
  const lastInstallment = installmentPreview.occurrences.at(-1);
  const installmentTotal = installmentPreview.occurrences.reduce(
    (total, installment) => total + installment.amount,
    0,
  );
  const installmentAmounts = [
    ...new Set(installmentPreview.occurrences.map((item) => item.amount)),
  ];
  const operationType = (selectedCategory?.type as CategoryType | undefined) ?? categoryFilter;
  const operationLabel =
    operationType === 'INCOME'
      ? 'Receita'
      : operationType === 'EXPENSE'
        ? 'Despesa'
        : 'Selecione o tipo';
  const selectedStatusLabel =
    statusOptions.find((option) => option.value === formData.status)?.label ?? formData.status;
  const selectedDateLabel = formatPtBrLogicalDate({
    year: formData.year,
    month: formData.month,
    day: formData.day,
  });
  const creationModeLabel =
    creationMode === 'single'
      ? 'Única'
      : creationMode === 'recurring'
        ? 'Recorrente mensal'
        : 'Parcelada';
  const createLabel =
    creationMode === 'recurring'
      ? 'Criar recorrência'
      : creationMode === 'installment'
        ? 'Criar parcelamento'
        : 'Criar transação';
  const summaryAmountPrefix =
    operationType === 'EXPENSE' ? '- ' : operationType === 'INCOME' ? '+ ' : '';
  const showFixedMobileActions = !onSuccess;

  return (
    <>
      <FormContainer
        onSubmit={handleSubmit}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="mt-3 !border-0 !bg-transparent !p-0 !pb-20 !shadow-none [--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)] lg:!pb-0"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <section
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-[18px]"
            aria-label={isEditing ? 'Editar transação' : 'Nova transação'}
          >
            <div className="grid grid-cols-2 gap-2" aria-label="Tipo da transação">
              <button
                type="button"
                aria-pressed={operationType === 'EXPENSE'}
                onClick={() => handleCategoryType('EXPENSE')}
                disabled={loading}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-[11px] border px-3 py-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50 sm:text-base ${
                  operationType === 'EXPENSE'
                    ? 'border-[var(--expense)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                    : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
                }`}
              >
                <FaArrowDown aria-hidden="true" />
                Despesa
              </button>
              <button
                type="button"
                aria-pressed={operationType === 'INCOME'}
                onClick={() => handleCategoryType('INCOME')}
                disabled={loading}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-[11px] border px-3 py-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50 sm:text-base ${
                  operationType === 'INCOME'
                    ? 'border-[var(--income)] bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]'
                    : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
                }`}
              >
                <FaArrowUp aria-hidden="true" />
                Receita
              </button>
            </div>

            <div className="mt-4 rounded-[14px] border border-[var(--orbit-primary)] bg-[var(--surface-subtle)] p-4 sm:p-[18px]">
              <label
                htmlFor="transaction-amount"
                className="mb-2 block text-sm font-medium text-[var(--text-muted)]"
              >
                {creationMode === 'installment' ? 'Valor total' : 'Valor'}
                <span className="ml-1 text-[var(--expense)]" aria-hidden="true">
                  *
                </span>
              </label>
              <Input
                id="transaction-amount"
                ref={amountInputRef}
                aria-label={creationMode === 'installment' ? 'Valor total' : 'Valor'}
                value={displayValue}
                onChange={handleAmountChange}
                onFocus={moveCursorToEnd}
                onClick={moveCursorToEnd}
                disabled={loading}
                required
                inputMode="numeric"
                className="!min-h-12 !border-0 !bg-transparent !px-0 !py-0 text-[34px] font-extrabold tracking-tight !text-[var(--foreground)] !outline-none focus-visible:!outline-none sm:text-[38px]"
              />
            </div>

            <div className="mt-4 grid gap-x-3 gap-y-3 md:grid-cols-2">
              <Select
                label="Conta"
                value={formData.accountId}
                onChange={(value) =>
                  setFormData((previous) => ({ ...previous, accountId: String(value) }))
                }
                options={accountOptions}
                disabled={loading}
                required
                placeholder="Selecione uma conta"
              />

              <Select
                label="Categoria"
                value={formData.categoryId}
                onChange={handleCategoryChange}
                options={categoryOptions}
                disabled={loading}
                required
                grouped
                placeholder="Selecione uma categoria"
              />

              {!isFixedDate ? (
                <Input
                  label={creationMode === 'installment' ? 'Data da primeira parcela' : 'Data'}
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
                    setFormData((previous) => ({ ...previous, day, month, year }));
                  }}
                  disabled={loading}
                  required
                />
              ) : (
                <div>
                  <p className="ds-label mb-2">Data</p>
                  <div className="ds-control flex items-center px-3.5">{selectedDateLabel}</div>
                </div>
              )}

              <Input
                label="Descrição"
                value={formData.description}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                disabled={loading}
                required
                placeholder="Ex.: Supermercado, salário, aluguel..."
              />
            </div>

            <details className="group mt-4 overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--orbit-focus)]">
                <span>✦ Adicionar detalhes</span>
                <span className="text-[var(--text-muted)] group-open:hidden" aria-hidden="true">
                  ⌄
                </span>
                <span className="hidden text-[var(--text-muted)] group-open:inline" aria-hidden="true">
                  ⌃
                </span>
              </summary>

              <div className="space-y-5 border-t border-[var(--border)] p-4">
                <RadioGroup
                  required
                  name="status"
                  label={creationMode === 'installment' ? 'Status da primeira parcela' : 'Status'}
                  value={formData.status}
                  onChange={(value) =>
                    setFormData((previous) => ({
                      ...previous,
                      status: value as TransactionStatus,
                    }))
                  }
                  options={statusOptions}
                  disabled={loading}
                />

                {!isEditing && (
                  <RadioGroup
                    name="creation-mode"
                    label="Criar como"
                    value={creationMode}
                    onChange={(value) => setCreationMode(value as CreationMode)}
                    disabled={loading}
                    options={[
                      { value: 'single', label: 'Única' },
                      { value: 'recurring', label: 'Recorrente' },
                      { value: 'installment', label: 'Parcelada' },
                    ]}
                  />
                )}

                {creationMode === 'recurring' && !isEditing && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                    <div className="flex items-start gap-3">
                      <FaRedoAlt
                        className="mt-1 shrink-0 text-[var(--orbit-primary)]"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">
                            Repetir mensalmente
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            A série é finita e criada no momento da confirmação.
                          </p>
                        </div>
                        <RadioGroup
                          name="recurrence-mode"
                          label="Terminar por"
                          value={recurrenceMode}
                          onChange={(value) => setRecurrenceMode(value as RecurrenceMode)}
                          disabled={loading}
                          options={[
                            { value: 'count', label: 'Quantidade' },
                            { value: 'endDate', label: 'Data final' },
                          ]}
                        />
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
                        <div
                          className={`rounded-[var(--radius-md)] border p-3 text-sm leading-relaxed ${
                            recurrencePreview.error
                              ? 'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                              : 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--foreground)]'
                          }`}
                          role={recurrencePreview.error ? 'alert' : 'status'}
                        >
                          {recurrencePreview.error
                            ? recurrencePreview.error
                            : firstRecurrenceDate && lastRecurrenceDate
                              ? `${recurrencePreview.dates.length} ocorrências · ${formatPtBrLogicalDate(firstRecurrenceDate)} até ${formatPtBrLogicalDate(lastRecurrenceDate)}. As futuras serão pendentes.`
                              : 'Configure a recorrência para revisar o período.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {creationMode === 'installment' && !isEditing && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                    <div className="flex items-start gap-3">
                      <FaCreditCard
                        className="mt-1 shrink-0 text-[var(--orbit-primary)]"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">Parcelar despesa</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            O valor principal é o total; os centavos são distribuídos exatamente.
                          </p>
                        </div>
                        <Input
                          label="Quantidade de parcelas"
                          type="number"
                          min={2}
                          max={MAX_MONTHLY_OCCURRENCES}
                          value={installmentCount}
                          onChange={(event) => setInstallmentCount(Number(event.target.value))}
                          disabled={loading}
                          required
                        />
                        <div
                          className={`rounded-[var(--radius-md)] border p-3 text-sm leading-relaxed ${
                            installmentPreview.error
                              ? 'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                              : 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--foreground)]'
                          }`}
                          role={installmentPreview.error ? 'alert' : 'status'}
                        >
                          {installmentPreview.error ? (
                            installmentPreview.error
                          ) : firstInstallment && lastInstallment ? (
                            <div className="space-y-1">
                              <p>
                                <strong>{installmentPreview.occurrences.length} parcelas</strong> ·{' '}
                                {formatPtBrLogicalDate(firstInstallment)} até{' '}
                                {formatPtBrLogicalDate(lastInstallment)}.
                              </p>
                              <p>
                                {installmentAmounts.length === 1
                                  ? `Cada parcela: ${formatCentsToCurrency(installmentAmounts[0])}.`
                                  : `${formatCentsToCurrency(Math.min(...installmentAmounts))} a ${formatCentsToCurrency(Math.max(...installmentAmounts))}, com resíduos nas primeiras parcelas.`}
                              </p>
                              <p>
                                Total conferido:{' '}
                                <strong>{formatCentsToCurrency(installmentTotal)}</strong>.
                              </p>
                            </div>
                          ) : (
                            'Selecione uma categoria de despesa e informe o parcelamento.'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </details>

            <div
              className={`${
                onSuccess ? 'flex' : 'hidden lg:flex'
              } mt-5 flex-col-reverse gap-2 sm:flex-row sm:justify-end`}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={loading}
                disabled={loading}
                icon={!isEditing && !onSuccess ? <FaArrowRight /> : <FaCheck />}
                iconPosition="right"
              >
                {isEditing
                  ? 'Salvar alterações'
                  : !onSuccess
                    ? 'Revisar e criar'
                    : createLabel}
              </Button>
            </div>
          </section>

          <aside className="hidden lg:block">
            <div
              className="sticky top-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-[18px]"
              aria-labelledby="quick-compose-summary"
            >
              <h2
                id="quick-compose-summary"
                className="text-lg font-semibold text-[var(--foreground)]"
              >
                Resumo da transação
              </h2>

              <span
                className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${
                  operationType === 'EXPENSE'
                    ? 'border-[var(--expense)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                    : operationType === 'INCOME'
                      ? 'border-[var(--income)] bg-[color-mix(in_srgb,var(--income)_12%,transparent)] text-[var(--income)]'
                      : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]'
                }`}
              >
                {operationType === 'EXPENSE' ? (
                  <FaArrowDown aria-hidden="true" />
                ) : operationType === 'INCOME' ? (
                  <FaArrowUp aria-hidden="true" />
                ) : null}
                {operationLabel}
              </span>

              <p
                className={`mt-4 text-[30px] font-black tracking-tight ${
                  operationType === 'EXPENSE'
                    ? 'text-[var(--expense)]'
                    : operationType === 'INCOME'
                      ? 'text-[var(--income)]'
                      : 'text-[var(--foreground)]'
                }`}
              >
                {summaryAmountPrefix}
                {formatCentsToCurrency(formData.amount)}
              </p>

              <dl className="mt-5 grid gap-3 text-sm">
                <SummaryRow
                  label="Conta"
                  value={
                    selectedAccount
                      ? `${selectedAccount.name} · ${selectedAccount.currency}`
                      : 'Não selecionada'
                  }
                />
                <SummaryRow label="Categoria" value={selectedCategory?.name ?? 'Não selecionada'} />
                <SummaryRow label="Data" value={selectedDateLabel} />
                <SummaryRow label="Status" value={selectedStatusLabel} />
              </dl>

              {!isEditing && creationMode !== 'single' && (
                <p className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm text-[var(--text-muted)]">
                  Forma: <strong className="text-[var(--foreground)]">{creationModeLabel}</strong>
                </p>
              )}

              <div className="mt-5 rounded-[12px] border border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] p-3 text-sm leading-relaxed text-[var(--text-muted)]">
                <strong className="text-[var(--foreground)]">✦ Dica Orbit</strong>
                <br />
                Detalhes avançados ficam escondidos até você precisar deles.
              </div>
            </div>
          </aside>
        </div>
      </FormContainer>

      {showFixedMobileActions && (
        <div className="fixed bottom-[calc(var(--app-mobile-bottom-nav-height)_+_env(safe-area-inset-bottom))] left-0 right-0 z-40 grid grid-cols-2 gap-2 border-t border-[var(--border)] bg-[var(--card)]/95 px-3 py-2 backdrop-blur lg:hidden">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={loading}
            fullWidth
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              const form = amountInputRef.current?.form;
              form?.requestSubmit();
            }}
            isLoading={loading}
            disabled={loading}
            fullWidth
          >
            {isEditing ? 'Salvar' : 'Criar transação'}
          </Button>
        </div>
      )}

      <TransactionReviewModal
        isOpen={reviewOpen}
        isLoading={isSubmitting}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => {
          setReviewOpen(false);
          void persistTransaction();
        }}
        operationLabel={operationLabel}
        amount={formatCentsToCurrency(formData.amount)}
        account={selectedAccount?.name ?? 'Não selecionada'}
        category={selectedCategory?.name ?? 'Não selecionada'}
      />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}

interface TransactionReviewModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  operationLabel: string;
  amount: string;
  account: string;
  category: string;
}

function TransactionReviewModal({
  isOpen,
  isLoading,
  onClose,
  onConfirm,
  operationLabel,
  amount,
  account,
  category,
}: TransactionReviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !isLoading) {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable?.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (activeElement === dialogRef.current) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar revisão"
        className="absolute inset-0 h-full w-full bg-[var(--overlay)]"
        onClick={isLoading ? undefined : onClose}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-busy={isLoading || undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="pointer-events-auto w-full max-w-[520px] rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] p-5 shadow-2xl [--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary:var(--orbit-primary)]"
        >
          <h2 id={titleId} className="text-xl font-semibold text-[var(--foreground)]">
            Revisar transação
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-[var(--text-muted)]">
            Confira os dados antes de criar.
          </p>

          <dl className="mt-4 grid gap-2">
            <ReviewRow label="Tipo" value={operationLabel} />
            <ReviewRow label="Valor" value={amount} />
            <ReviewRow label="Conta" value={account} />
            <ReviewRow label="Categoria" value={category} />
          </dl>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Voltar
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              isLoading={isLoading}
              disabled={isLoading}
              icon={<FaCheck />}
            >
              Criar transação
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] bg-[var(--surface-raised)] px-3.5 py-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}
