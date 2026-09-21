'use client';

import { useRouter } from 'next/navigation';
import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  FaArrowDown,
  FaArrowRight,
  FaArrowUp,
  FaCalendarAlt,
  FaCalculator,
  FaCheck,
  FaChevronRight,
  FaCog,
  FaCreditCard,
  FaExchangeAlt,
  FaFileAlt,
  FaRedoAlt,
  FaSlidersH,
  FaTag,
  FaWallet,
} from 'react-icons/fa';

import { FormContainer } from '@/app/components/forms';
import { Button, IconRenderer, Input, RadioGroup } from '@/app/components/ui';
import ReceiptSelect from '@/app/components/pages/transactions/shared/receipt-select';
import { statusOptions } from '@/app/lib/constants/transaction.constants';
import { useCurrencyFormatter } from '@/app/lib/currency/format-currency';
import { FormData } from '@/app/lib/interface/transaction.interface';
import { buildInstallmentOccurrences } from '@/app/lib/transactions/installments';
import {
  generateLogicalRecurrenceDates,
  MAX_RECURRENCE_OCCURRENCES,
} from '@/app/lib/transactions/logical-recurrence';
import {
  formatIsoLogicalDate,
  formatPtBrLogicalDate,
  MAX_MONTHLY_OCCURRENCES,
  parseIsoLogicalDate,
} from '@/app/lib/transactions/monthly-recurrence';
import {
  getRecurrencePresetLabel,
  getRecurrencePresetRule,
  recurrencePresetOptions,
  type RecurrencePreset,
} from '@/app/lib/transactions/recurrence-presets';
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
  initialCategoryType?: 'INCOME' | 'EXPENSE' | null;
  onSelectTransfer?: () => void;
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
  initialCategoryType = null,
  onSelectTransfer,
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
  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePreset>('monthly');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('count');
  const [occurrenceCount, setOccurrenceCount] = useState(12);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState(2);
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | null>(initialCategoryType);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find((account) => account.id === formData.accountId);
  const selectedCategory = categories.find((category) => category.id === formData.categoryId);
  const effectiveCategoryFilter =
    (selectedCategory?.type as CategoryType | undefined) ?? categoryFilter;
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

  const recurrencePreview = useMemo(() => {
    if (creationMode !== 'recurring' || isEditing) {
      return { dates: [], error: null as string | null };
    }

    const start = {
      year: formData.year,
      month: formData.month,
      day: formData.day,
    };
    const recurrenceRule = getRecurrencePresetRule(recurrencePreset);

    try {
      if (recurrenceMode === 'count') {
        return {
          dates: generateLogicalRecurrenceDates(start, {
            ...recurrenceRule,
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
        dates: generateLogicalRecurrenceDates(start, {
          ...recurrenceRule,
          mode: 'endDate',
          endDate,
        }),
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
    recurrencePreset,
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

        const recurrenceRule = getRecurrencePresetRule(recurrencePreset);
        const ending =
          recurrenceMode === 'count'
            ? { mode: 'count' as const, occurrences: occurrenceCount }
            : { mode: 'endDate' as const, endDate: recurrenceEndDate };

        const response = await transactionService.createFlexibleRecurring({
          transaction: payload,
          recurrence: { ...recurrenceRule, ...ending },
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

  function validatePrimaryFields() {
    if (!Number.isInteger(formData.amount) || formData.amount <= 0) {
      return 'Informe um valor maior que zero';
    }
    if (!formData.accountId) {
      return 'Selecione uma conta';
    }
    if (!formData.categoryId) {
      return 'Selecione uma categoria';
    }
    if (!formData.description.trim()) {
      return 'Informe uma descrição';
    }
    return null;
  }

  function validateAdvancedFields() {
    if (creationMode === 'recurring' && !isEditing) {
      if (recurrencePreview.error || recurrencePreview.dates.length < 2) {
        return recurrencePreview.error || 'Recorrência inválida';
      }
    }

    if (creationMode === 'installment' && !isEditing) {
      if (installmentPreview.error || installmentPreview.occurrences.length < 2) {
        return installmentPreview.error || 'Parcelamento inválido';
      }
    }

    return null;
  }

  function advanceMobilePrimaryStep() {
    setSubmitError(null);
    const validationError = validatePrimaryFields();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setMobileStep(2);
  }

  function advanceMobileAdvancedStep() {
    setSubmitError(null);
    const validationError = validateAdvancedFields();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setMobileStep(3);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const primaryError = validatePrimaryFields();
    if (primaryError) {
      setSubmitError(primaryError);
      return;
    }

    if (!isEditing && !onSuccess) {
      setReviewOpen(true);
      return;
    }

    void persistTransaction();
  }

  const loading = isSubmitting || loadingData;
  const accountOptions = accounts
    .filter((account) => account.isActive)
    .map((account) => ({
      value: account.id,
      label: account.name,
      color: account.color,
      icon: account.icon,
    }));
  const categoryOptions = [
    {
      type: 'INCOME' as const,
      label: 'Receitas',
      options: categories
        .filter((category) => category.type === 'INCOME')
        .map((category) => ({
          value: category.id,
          label: category.name,
          color: category.color,
          icon: category.icon,
        })),
    },
    {
      type: 'EXPENSE' as const,
      label: 'Despesas',
      options: categories
        .filter((category) => category.type === 'EXPENSE')
        .map((category) => ({ value: category.id, label: category.name })),
    },
  ]
    .filter((group) => !effectiveCategoryFilter || group.type === effectiveCategoryFilter)
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
  const operationType = effectiveCategoryFilter;
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
  const recurrencePresetLabel = getRecurrencePresetLabel(recurrencePreset);
  const creationModeLabel =
    creationMode === 'single'
      ? 'Única'
      : creationMode === 'recurring'
        ? `Recorrente ${recurrencePresetLabel.toLowerCase()}`
        : 'Parcelada';
  const createLabel =
    creationMode === 'recurring'
      ? 'Criar recorrência'
      : creationMode === 'installment'
        ? 'Criar parcelamento'
        : 'Criar transação';
  return (
    <>
      <FormContainer
        onSubmit={(event) => event.preventDefault()}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="mt-4 !border-0 !bg-transparent !p-0 !pb-4 !shadow-none [--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)] lg:hidden"
      >
        <section aria-label={isEditing ? 'Editar transação mobile' : 'Nova transação mobile'}>
          <div className="mb-5 grid grid-cols-[auto_minmax(44px,1fr)_auto_minmax(44px,1fr)_auto] items-start gap-2 px-4" aria-label="Etapas da transação">
            {([
              [1, 'Valor'],
              [2, 'Detalhes'],
              [3, 'Revisão'],
            ] as const).map(([step, label], index) => (
              <div key={step} className="contents">
                {index > 0 && (
                  <span
                    className={`mt-5 h-px self-start ${
                      mobileStep >= step ? 'bg-[var(--orbit-primary)]' : 'bg-[var(--border-strong)]'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div className="grid justify-items-center gap-1.5">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full border text-sm font-bold ${
                      mobileStep === step
                        ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary)] text-[var(--orbit-on-primary)] shadow-[0_0_18px_color-mix(in_srgb,var(--orbit-primary)_45%,transparent)]'
                        : mobileStep > step
                          ? 'border-[var(--orbit-primary)] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
                          : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    {step}
                  </span>
                  <span className={`text-xs font-medium ${mobileStep === step ? 'text-[var(--orbit-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {mobileStep === 1 && (
            <div className="space-y-4">
              <div
                className="grid grid-cols-3 overflow-hidden rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface)] p-1"
                aria-label="Tipo da transação"
              >
                <button
                  type="button"
                  aria-pressed={operationType === 'EXPENSE'}
                  onClick={() => handleCategoryType('EXPENSE')}
                  disabled={loading}
                  className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-[10px] px-2 text-xs font-bold transition-colors min-[360px]:gap-2 min-[360px]:text-sm ${
                    operationType === 'EXPENSE'
                      ? 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)] ring-1 ring-inset ring-[var(--orbit-primary)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  <FaArrowDown aria-hidden="true" /> <span className="truncate">Despesa</span>
                </button>
                <button
                  type="button"
                  aria-pressed={operationType === 'INCOME'}
                  onClick={() => handleCategoryType('INCOME')}
                  disabled={loading}
                  className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 border-l border-[var(--border)] px-2 text-xs font-bold transition-colors min-[360px]:gap-2 min-[360px]:text-sm ${
                    operationType === 'INCOME'
                      ? 'rounded-[10px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)] ring-1 ring-inset ring-[var(--orbit-primary)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  <FaArrowUp aria-hidden="true" /> <span className="truncate">Receita</span>
                </button>
                <button
                  type="button"
                  onClick={onSelectTransfer}
                  disabled={loading || !onSelectTransfer}
                  aria-label={isEditing ? 'Transferência indisponível na edição' : 'Transferência'}
                  className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 border-l border-[var(--border)] px-1.5 text-[11px] font-bold text-[var(--text-muted)] disabled:opacity-35 min-[360px]:gap-2 min-[360px]:px-2 min-[360px]:text-sm"
                >
                  <FaExchangeAlt aria-hidden="true" /> <span className="truncate">Transferência</span>
                </button>
              </div>

              <div
                className="min-h-[142px] rounded-[16px] border border-[var(--orbit-primary)] bg-[var(--surface)] p-4"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--orbit-primary) 9%, var(--surface)) 0%, var(--surface) 72%)',
                  boxShadow:
                    'inset 0 0 34px color-mix(in srgb, var(--orbit-primary) 7%, transparent)',
                }}
              >
                <label htmlFor="mobile-transaction-amount" className="text-sm text-[var(--text-muted)]">
                  {creationMode === 'installment' ? 'Valor total da transação' : 'Valor da transação'}
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    id="mobile-transaction-amount"
                    aria-label={creationMode === 'installment' ? 'Valor total' : 'Valor'}
                    value={displayValue}
                    onChange={handleAmountChange}
                    disabled={loading}
                    inputMode="numeric"
                    className="!min-h-[76px] min-w-0 flex-1 !border-0 !bg-transparent !px-0 !py-0 text-[44px] font-black tracking-tight !text-[var(--foreground)] !outline-none focus-visible:!outline-none min-[390px]:text-[50px]"
                  />
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-muted)]" aria-hidden="true">
                    <FaCalculator />
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <h2 className="text-xl font-bold text-[var(--foreground)]">Detalhes da transação</h2>
                <span className="shrink-0 text-sm text-[var(--text-muted)]">Passo 1 de 3</span>
              </div>

              <div className="grid gap-2.5">
                <ReceiptSelect
                  ariaLabel="Conta"
                  value={formData.accountId}
                  disabled={loading}
                  onChange={(value) => setFormData((previous) => ({ ...previous, accountId: value }))}
                  options={accountOptions}
                  triggerClassName="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 text-left transition-colors hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
                    <FaWallet aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Conta <span className="text-[var(--expense)]">*</span></strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">{selectedAccount?.name ?? 'Selecione uma conta'}</span>
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </ReceiptSelect>

                <ReceiptSelect
                  ariaLabel="Categoria"
                  value={formData.categoryId}
                  disabled={loading}
                  onChange={handleCategoryChange}
                  groups={categoryOptions}
                  triggerClassName="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 text-left transition-colors hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50"
                >
                  <span
                    className="grid h-12 w-12 place-items-center rounded-[12px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]"
                    style={selectedCategory?.color ? { color: selectedCategory.color } : undefined}
                  >
                    {selectedCategory ? <IconRenderer iconName={selectedCategory.icon || 'tag'} size={17} /> : <FaTag aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Categoria <span className="text-[var(--expense)]">*</span></strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">{selectedCategory?.name ?? 'Selecione uma categoria'}</span>
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </ReceiptSelect>

                <label className={`relative grid min-h-[86px] grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 ${isFixedDate ? '' : 'cursor-pointer'}`}>
                  <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
                    <FaCalendarAlt aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--foreground)]">Data <span className="text-[var(--expense)]">*</span></span>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">{selectedDateLabel}</span>
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                  {!isFixedDate && (
                    <input
                      aria-label={creationMode === 'installment' ? 'Data da primeira parcela' : 'Data'}
                      type="date"
                      value={formatIsoLogicalDate({ year: formData.year, month: formData.month, day: formData.day })}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        const [year, month, day] = event.target.value.split('-').map(Number);
                        setFormData((previous) => ({ ...previous, day, month, year }));
                      }}
                      disabled={loading}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  )}
                </label>

                <div className="grid min-h-[86px] grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3">
                  <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
                    <FaFileAlt aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <label htmlFor="mobile-transaction-description" className="block text-sm font-bold text-[var(--foreground)]">
                      Descrição <span className="text-[var(--expense)]">*</span>
                    </label>
                    <input
                      id="mobile-transaction-description"
                      aria-label="Descrição"
                      value={formData.description}
                      onChange={(event) => setFormData((previous) => ({ ...previous, description: event.target.value }))}
                      disabled={loading}
                      maxLength={255}
                      placeholder="Ex.: Supermercado, salário, aluguel..."
                      className="mt-1 w-full min-w-0 bg-transparent text-base text-[var(--text-muted)] outline-none placeholder:text-[var(--text-subtle)]"
                    />
                  </span>
                  <FaChevronRight className="text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </div>

                <button
                  type="button"
                  onClick={advanceMobilePrimaryStep}
                  disabled={loading}
                  className="grid min-h-[86px] w-full grid-cols-[52px_minmax(0,1fr)_18px] items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 text-left disabled:opacity-50"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-[var(--surface-raised)] text-[var(--orbit-primary)]">
                    <FaCog aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-[var(--foreground)]">Detalhes avançados</strong>
                    <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">Status, recorrência e parcelamento</span>
                  </span>
                  <FaChevronRight className="rotate-90 text-sm text-[var(--text-muted)]" aria-hidden="true" />
                </button>
              </div>

              <div className="grid grid-cols-[.92fr_1.08fr] gap-2.5 pt-1 [&_button]:!min-h-14">
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={loading} fullWidth>
                  Cancelar
                </Button>
                <Button type="button" onClick={advanceMobilePrimaryStep} disabled={loading} icon={<FaArrowRight />} iconPosition="right" fullWidth>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {mobileStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Detalhes avançados</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Passo 2 de 3 · ajuste apenas o que precisar.</p>
              </div>

              <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <p className="text-xs text-[var(--text-muted)]">Transação</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <strong className="truncate text-sm text-[var(--foreground)]">{operationLabel}</strong>
                  <strong className="shrink-0 text-lg text-[var(--foreground)]">{formatCentsToCurrency(formData.amount)}</strong>
                </div>
              </div>

              <div className="grid gap-3">
                <div>
                  <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Status</p>
                  <RadioGroup
                    required
                    name="status-mobile"
                    value={formData.status}
                    onChange={(value) => setFormData((previous) => ({ ...previous, status: value as TransactionStatus }))}
                    options={statusOptions}
                    disabled={loading}
                  />
                </div>

                {!isEditing && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">Criar como</p>
                    <ReceiptSelect
                      ariaLabel="Criar como"
                      value={creationMode}
                      disabled={loading}
                      onChange={(value) => setCreationMode(value as CreationMode)}
                      options={[
                        { value: 'single', label: 'Única' },
                        { value: 'recurring', label: 'Recorrente' },
                        { value: 'installment', label: 'Parcelada' },
                      ]}
                      triggerClassName="flex min-h-12 w-full items-center justify-between gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm font-semibold text-[var(--foreground)]"
                    >
                      <span>{creationModeLabel}</span>
                      <FaChevronRight className="rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
                    </ReceiptSelect>
                  </div>
                )}

                {!isEditing && creationMode === 'recurring' && (
                  <div className="space-y-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div>
                      <strong className="text-sm text-[var(--foreground)]">Recorrência</strong>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Configure quando este lançamento deve se repetir.</p>
                    </div>
                    <ReceiptSelect
                      ariaLabel="Frequência"
                      value={recurrencePreset}
                      disabled={loading}
                      onChange={(value) => setRecurrencePreset(value as RecurrencePreset)}
                      options={recurrencePresetOptions.map((option) => ({ value: String(option.value), label: option.label }))}
                      triggerClassName="flex min-h-12 w-full items-center justify-between gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-left text-sm"
                    >
                      <span>{recurrencePresetLabel}</span>
                      <FaChevronRight className="rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
                    </ReceiptSelect>
                    <RadioGroup
                      name="recurrence-mode-mobile"
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
                        max={MAX_RECURRENCE_OCCURRENCES}
                        value={occurrenceCount}
                        onChange={(event) => setOccurrenceCount(Number(event.target.value))}
                        disabled={loading}
                      />
                    ) : (
                      <Input
                        label="Data final"
                        type="date"
                        value={recurrenceEndDate}
                        min={formatIsoLogicalDate({ year: formData.year, month: formData.month, day: formData.day })}
                        onChange={(event) => setRecurrenceEndDate(event.target.value)}
                        disabled={loading}
                      />
                    )}
                    <p role="status" className={`rounded-[10px] border p-3 text-xs ${
                      recurrencePreview.error
                        ? 'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                        : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]'
                    }`}>
                      {recurrencePreview.error
                        ? recurrencePreview.error
                        : firstRecurrenceDate && lastRecurrenceDate
                          ? `${recurrencePresetLabel} · ${recurrencePreview.dates.length} ocorrências · ${formatPtBrLogicalDate(firstRecurrenceDate)} até ${formatPtBrLogicalDate(lastRecurrenceDate)}. As futuras serão pendentes.`
                          : 'Configure a recorrência para revisar o período.'}
                    </p>
                  </div>
                )}

                {!isEditing && creationMode === 'installment' && (
                  <div className="space-y-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div>
                      <strong className="text-sm text-[var(--foreground)]">Parcelamento</strong>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">O valor informado é o total da compra.</p>
                    </div>
                    <Input
                      label="Quantidade de parcelas"
                      type="number"
                      min={2}
                      max={MAX_MONTHLY_OCCURRENCES}
                      value={installmentCount}
                      onChange={(event) => setInstallmentCount(Number(event.target.value))}
                      disabled={loading}
                    />
                    <p className={`rounded-[10px] border p-3 text-xs ${
                      installmentPreview.error
                        ? 'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--expense)]'
                        : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]'
                    }`}>
                      {installmentPreview.error
                        ? installmentPreview.error
                        : firstInstallment && lastInstallment
                          ? `${installmentPreview.occurrences.length} parcelas · ${formatPtBrLogicalDate(firstInstallment)} até ${formatPtBrLogicalDate(lastInstallment)} · total ${formatCentsToCurrency(installmentTotal)}.`
                          : 'Informe o parcelamento para revisar as parcelas.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[.92fr_1.08fr] gap-2.5 pt-1 [&_button]:!min-h-14">
                <Button type="button" variant="secondary" onClick={() => setMobileStep(1)} disabled={loading} fullWidth>
                  Voltar
                </Button>
                <Button type="button" onClick={advanceMobileAdvancedStep} disabled={loading} icon={<FaArrowRight />} iconPosition="right" fullWidth>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {mobileStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Revisar transação</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Passo 3 de 3 · confira antes de confirmar.</p>
              </div>

              <div className="rounded-[16px] border border-[var(--orbit-primary)]/45 bg-[var(--surface)] p-4">
                <p className="text-xs text-[var(--text-muted)]">{operationLabel}</p>
                <strong className="mt-1 block text-[34px] font-black tracking-tight text-[var(--foreground)]">
                  {formatCentsToCurrency(formData.amount)}
                </strong>
                <dl className="mt-4 grid gap-2">
                  <ReviewRow label="Conta" value={selectedAccount?.name ?? 'Não selecionada'} />
                  <ReviewRow label="Categoria" value={selectedCategory?.name ?? 'Não selecionada'} />
                  <ReviewRow label="Data" value={selectedDateLabel} />
                  <ReviewRow label="Descrição" value={formData.description || 'Sem descrição'} />
                  <ReviewRow label="Status" value={selectedStatusLabel} />
                  <ReviewRow label="Formato" value={creationModeLabel} />
                </dl>
              </div>

              <div className="grid grid-cols-[.92fr_1.08fr] gap-2.5 pt-1 [&_button]:!min-h-14">
                <Button type="button" variant="secondary" onClick={() => setMobileStep(2)} disabled={loading} fullWidth>
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => void persistTransaction()}
                  isLoading={isSubmitting}
                  disabled={loading}
                  icon={<FaCheck />}
                  iconPosition="right"
                  fullWidth
                >
                  {isEditing ? 'Salvar alterações' : createLabel}
                </Button>
              </div>
            </div>
          )}
        </section>
      </FormContainer>

      <FormContainer
        onSubmit={handleSubmit}
        error={submitError}
        onClearError={() => setSubmitError(null)}
        className="mt-4 hidden !border-0 !bg-transparent !p-0 !shadow-none [--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary-subtle:var(--orbit-primary-subtle)] [--primary:var(--orbit-primary)] lg:block"
      >
        <section
          className="mx-auto w-full max-w-[860px] overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-surface)]"
          aria-label={isEditing ? 'Editar transação' : 'Nova transação'}
        >
          <div className="p-4 sm:p-6">
            <div
              className="mx-auto grid max-w-[520px] grid-cols-3 overflow-hidden rounded-[12px] border border-[var(--border-strong)] bg-[var(--surface)] p-1"
              aria-label="Tipo da transação"
            >
              <button
                type="button"
                aria-pressed={operationType === 'EXPENSE'}
                onClick={() => handleCategoryType('EXPENSE')}
                disabled={loading}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-[9px] px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50 ${
                  operationType === 'EXPENSE'
                    ? 'bg-[var(--orbit-primary)] text-[var(--orbit-on-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                }`}
              >
                <FaArrowDown aria-hidden="true" /> Despesa
              </button>
              <button
                type="button"
                aria-pressed={operationType === 'INCOME'}
                onClick={() => handleCategoryType('INCOME')}
                disabled={loading}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-[9px] px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50 ${
                  operationType === 'INCOME'
                    ? 'bg-[var(--orbit-primary)] text-[var(--orbit-on-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                }`}
              >
                <FaArrowUp aria-hidden="true" /> Receita
              </button>
              <button
                type="button"
                onClick={onSelectTransfer}
                disabled={loading || !onSelectTransfer}
                aria-label={isEditing ? 'Transferência indisponível na edição' : 'Transferência'}
                className="flex min-h-10 items-center justify-center gap-2 rounded-[9px] px-3 text-sm font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--orbit-focus)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaExchangeAlt aria-hidden="true" /> Transferência
              </button>
            </div>

            <div className="mt-6 grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_210px]">
              <div className="text-center lg:pl-[110px]">
                <label htmlFor="transaction-amount" className="sr-only">
                  {creationMode === 'installment' ? 'Valor total' : 'Valor'}
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
                  className="mx-auto !min-h-[72px] !max-w-[420px] !border-0 !bg-transparent !px-0 !py-0 text-center text-[48px] font-black tracking-tight !text-[var(--foreground)] !outline-none focus-visible:!outline-none sm:text-[58px]"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {creationMode === 'installment' ? 'Valor total da compra' : 'Adicionar um valor'}
                </p>
              </div>

              <div className="grid gap-2 border-t border-[var(--border)] pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <ReceiptSelect
                  ariaLabel="Status"
                  value={formData.status}
                  disabled={loading}
                  onChange={(value) =>
                    setFormData((previous) => ({
                      ...previous,
                      status: value as TransactionStatus,
                    }))
                  }
                  options={statusOptions.map((option) => ({
                    value: String(option.value),
                    label: option.label,
                  }))}
                  triggerClassName="flex min-h-9 w-full items-center gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50"
                  menuClassName="min-w-[190px]"
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--orbit-primary)]" aria-hidden="true" />
                  <span className="truncate">{selectedStatusLabel}</span>
                  <FaChevronRight className="ml-auto rotate-90 text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
                </ReceiptSelect>

                {!isEditing ? (
                  <ReceiptSelect
                    ariaLabel="Criar como"
                    value={creationMode}
                    disabled={loading}
                    onChange={(value) => setCreationMode(value as CreationMode)}
                    options={[
                      { value: 'single', label: 'Única' },
                      { value: 'recurring', label: 'Recorrente' },
                      { value: 'installment', label: 'Parcelada' },
                    ]}
                    triggerClassName="flex min-h-9 w-full items-center gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50"
                    menuClassName="min-w-[190px]"
                  >
                    <FaCalendarAlt aria-hidden="true" />
                    <span className="truncate">{creationModeLabel}</span>
                    <FaChevronRight className="ml-auto rotate-90 text-[10px] text-[var(--text-muted)]" aria-hidden="true" />
                  </ReceiptSelect>
                ) : (
                  <div className="flex min-h-9 items-center gap-2 rounded-[9px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs text-[var(--text-muted)]">
                    <FaCalendarAlt aria-hidden="true" /> Única
                  </div>
                )}

              </div>
            </div>

            <div className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <ReceiptSelect
                ariaLabel="Conta"
                value={formData.accountId}
                disabled={loading}
                onChange={(value) =>
                  setFormData((previous) => ({ ...previous, accountId: value }))
                }
                options={accountOptions}
                triggerClassName="grid min-h-[44px] w-full grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50"
              >
                <FaWallet className="text-[var(--text-muted)]" aria-hidden="true" />
                <span className="text-[var(--text-muted)]">Conta</span>
                <span className="truncate text-right font-medium text-[var(--foreground)]">
                  {selectedAccount?.name ?? 'Selecione uma conta'}
                </span>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </ReceiptSelect>

              <ReceiptSelect
                ariaLabel="Categoria"
                value={formData.categoryId}
                disabled={loading}
                onChange={handleCategoryChange}
                groups={categoryOptions}
                triggerClassName="grid min-h-[44px] w-full grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-left text-sm transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--orbit-focus)] disabled:opacity-50"
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-white"
                  style={{ backgroundColor: selectedCategory?.color || 'var(--surface-subtle)' }}
                >
                  {selectedCategory ? (
                    <IconRenderer iconName={selectedCategory.icon || 'tag'} size={12} />
                  ) : (
                    <FaTag className="text-[var(--text-muted)]" aria-hidden="true" />
                  )}
                </span>
                <span className="text-[var(--text-muted)]">Categoria</span>
                <span className="truncate text-right font-medium text-[var(--foreground)]">
                  {selectedCategory?.name ?? 'Selecione uma categoria'}
                </span>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </ReceiptSelect>

              <label className={`relative grid min-h-[44px] grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-sm ${isFixedDate ? '' : 'cursor-pointer'}`}>
                <FaCalendarAlt className="text-[var(--text-muted)]" aria-hidden="true" />
                <span className="text-[var(--text-muted)]">Data</span>
                <span className="truncate text-right font-medium text-[var(--foreground)]">{selectedDateLabel}</span>
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
                {!isFixedDate && (
                  <input
                    aria-label={creationMode === 'installment' ? 'Data da primeira parcela' : 'Data'}
                    type="date"
                    value={formatIsoLogicalDate({
                      year: formData.year,
                      month: formData.month,
                      day: formData.day,
                    })}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      const [year, month, day] = event.target.value.split('-').map(Number);
                      setFormData((previous) => ({ ...previous, day, month, year }));
                    }}
                    disabled={loading}
                    required
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                )}
              </label>

              <div className="grid min-h-[44px] grid-cols-[28px_120px_minmax(0,1fr)_18px] items-center gap-2 px-2 text-sm">
                <FaFileAlt className="text-[var(--text-muted)]" aria-hidden="true" />
                <label htmlFor="transaction-description" className="text-[var(--text-muted)]">Descrição</label>
                <input
                  id="transaction-description"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, description: event.target.value }))
                  }
                  disabled={loading}
                  required
                  maxLength={255}
                  placeholder="Adicionar descrição"
                  className="min-w-0 bg-transparent text-right font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--text-subtle)]"
                />
                <FaChevronRight className="text-xs text-[var(--text-muted)]" aria-hidden="true" />
              </div>
            </div>

            <details className="group mt-3 border-y border-dashed border-[var(--border-strong)]">
              <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between gap-4 px-2 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--orbit-focus)]">
                <span className="flex items-center gap-3">
                  <FaSlidersH className="text-[var(--text-muted)]" aria-hidden="true" />
                  <span>
                    <strong className="block text-sm text-[var(--foreground)]">Detalhes avançados</strong>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      Status, recorrência e parcelamento
                    </span>
                  </span>
                </span>
                <span className="text-[var(--text-muted)] group-open:rotate-180" aria-hidden="true">⌄</span>
              </summary>

              <div className="space-y-5 border-t border-dashed border-[var(--border)] px-2 py-4">
                <RadioGroup
                  required
                  name="status-advanced"
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

                {!isEditing && creationMode === 'recurring' && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                    <div className="flex items-start gap-3">
                      <FaRedoAlt className="mt-1 shrink-0 text-[var(--orbit-primary)]" aria-hidden="true" />
                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">Repetir lançamento</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            Configure a frequência da série.
                          </p>
                        </div>
                        <div>
                          <p className="ds-label mb-2 block">Frequência</p>
                          <ReceiptSelect
                            ariaLabel="Frequência"
                            value={recurrencePreset}
                            disabled={loading}
                            onChange={(value) => setRecurrencePreset(value as RecurrencePreset)}
                            options={recurrencePresetOptions.map((option) => ({
                              value: String(option.value),
                              label: option.label,
                            }))}
                            triggerClassName="ds-control flex w-full items-center justify-between gap-3 px-3.5 text-left"
                          >
                            <span className="truncate">{recurrencePresetLabel}</span>
                            <FaChevronRight className="rotate-90 text-xs text-[var(--text-muted)]" aria-hidden="true" />
                          </ReceiptSelect>
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
                            max={MAX_RECURRENCE_OCCURRENCES}
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
                              ? `${recurrencePresetLabel} · ${recurrencePreview.dates.length} ocorrências · ${formatPtBrLogicalDate(firstRecurrenceDate)} até ${formatPtBrLogicalDate(lastRecurrenceDate)}. As futuras serão pendentes.`
                              : 'Configure a recorrência para revisar o período.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isEditing && creationMode === 'installment' && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                    <div className="flex items-start gap-3">
                      <FaCreditCard className="mt-1 shrink-0 text-[var(--orbit-primary)]" aria-hidden="true" />
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
                                <strong>{installmentPreview.occurrences.length} parcelas</strong> · {formatPtBrLogicalDate(firstInstallment)} até {formatPtBrLogicalDate(lastInstallment)}.
                              </p>
                              <p>
                                {installmentAmounts.length === 1
                                  ? `Cada parcela: ${formatCentsToCurrency(installmentAmounts[0])}.`
                                  : `${formatCentsToCurrency(Math.min(...installmentAmounts))} a ${formatCentsToCurrency(Math.max(...installmentAmounts))}, com resíduos nas primeiras parcelas.`}
                              </p>
                              <p>Total conferido: <strong>{formatCentsToCurrency(installmentTotal)}</strong>.</p>
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
          </div>

          <footer className="hidden items-center justify-end gap-3 border-t border-[var(--border)] bg-[var(--surface-raised)]/40 px-5 py-4 lg:flex sm:px-7">
            <Button type="button" variant="secondary" onClick={handleCancel} disabled={loading}>
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
          </footer>
        </section>
      </FormContainer>

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
