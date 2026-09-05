'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaCalendarAlt, FaCreditCard, FaRedoAlt } from 'react-icons/fa';

import { FormActions, FormContainer } from '@/app/components/forms';
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
  const firstInstallment = installmentPreview.occurrences[0];
  const lastInstallment = installmentPreview.occurrences.at(-1);
  const installmentTotal = installmentPreview.occurrences.reduce(
    (total, installment) => total + installment.amount,
    0,
  );
  const installmentAmounts = [...new Set(installmentPreview.occurrences.map((item) => item.amount))];
  const operationLabel =
    selectedCategory?.type === 'INCOME'
      ? 'Receita'
      : selectedCategory?.type === 'EXPENSE'
        ? 'Despesa'
        : 'Defina a categoria';
  const operationTone =
    selectedCategory?.type === 'INCOME' ? 'text-[var(--income)]' : selectedCategory?.type === 'EXPENSE' ? 'text-[var(--expense)]' : 'text-[var(--text-muted)]';
  const selectedStatusLabel = statusOptions.find((option) => option.value === formData.status)?.label ?? formData.status;
  const selectedDateLabel = formatPtBrLogicalDate({
    year: formData.year,
    month: formData.month,
    day: formData.day,
  });

  return (
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-2 !border-0 !bg-transparent !p-0 !shadow-none"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-start">
        <div className="ds-panel overflow-hidden">
          <section className="space-y-5 p-5 sm:p-6" aria-labelledby="quick-compose-main">
            <div>
              <p className={`text-sm font-semibold uppercase tracking-[0.14em] ${operationTone}`}>
                {operationLabel}
              </p>
              <h2 id="quick-compose-main" className="mt-1 text-xl font-semibold text-[var(--foreground)]">
                {isEditing ? 'Edite o essencial' : 'O que aconteceu?'}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                A categoria continua definindo se o lançamento é receita ou despesa.
              </p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
              <Input
                ref={amountInputRef}
                label={creationMode === 'installment' ? 'Valor total' : 'Valor'}
                value={displayValue}
                onChange={handleAmountChange}
                onFocus={moveCursorToEnd}
                onClick={moveCursorToEnd}
                disabled={loading}
                required
                inputMode="numeric"
                className="text-lg font-semibold"
              />
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

            <Input
              label="Descrição"
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              disabled={loading}
              required
              placeholder="Ex.: Supermercado, salário, aluguel..."
            />

            <div className="grid gap-4 md:grid-cols-2 md:items-start">
              <div className="space-y-2">
                {!isFixedDate ? (
                  <>
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
                      className="w-auto !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-transparent"
                    >
                      Usar hoje
                    </Button>
                  </>
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                    <p className="text-sm text-[var(--text-muted)]">Data selecionada</p>
                    <p className="mt-1 font-semibold text-[var(--foreground)]">{selectedDateLabel}</p>
                  </div>
                )}
              </div>

              <RadioGroup
                required
                name="status"
                label={creationMode === 'installment' ? 'Status da primeira parcela' : 'Status'}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as TransactionStatus })}
                options={statusOptions}
                disabled={loading}
              />
            </div>
          </section>

          {!isEditing && (
            <details className="group border-t border-[var(--border)]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] sm:px-6">
                <span>Opções avançadas</span>
                <span className="text-[var(--text-muted)] group-open:hidden">Recorrência ou parcelamento</span>
                <span className="text-[var(--text-muted)] hidden group-open:inline">Ocultar</span>
              </summary>

              <div className="space-y-5 border-t border-[var(--border)] p-5 sm:p-6">
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

                {creationMode === 'recurring' && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <FaRedoAlt className="mt-1 shrink-0 text-[var(--orbit-primary)]" aria-hidden="true" />
                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">Repetir mensalmente</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">A série é finita e criada no momento da confirmação.</p>
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
                            min={formatIsoLogicalDate({ year: formData.year, month: formData.month, day: formData.day })}
                            onChange={(event) => setRecurrenceEndDate(event.target.value)}
                            disabled={loading}
                            required
                          />
                        )}
                        <div
                          className={`rounded-[var(--radius-md)] border p-3 text-sm leading-relaxed ${
                            recurrencePreview.error
                              ? 'border-[var(--danger)]/35 bg-[var(--danger-subtle)] text-[var(--expense)]'
                              : 'border-[var(--orbit-primary)]/25 bg-[var(--primary-subtle)] text-[var(--foreground)]'
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

                {creationMode === 'installment' && (
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <FaCreditCard className="mt-1 shrink-0 text-[var(--orbit-primary)]" aria-hidden="true" />
                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">Parcelar despesa</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">O valor principal é o total; os centavos são distribuídos exatamente.</p>
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
                              ? 'border-[var(--danger)]/35 bg-[var(--danger-subtle)] text-[var(--expense)]'
                              : 'border-[var(--orbit-primary)]/25 bg-[var(--primary-subtle)] text-[var(--foreground)]'
                          }`}
                          role={installmentPreview.error ? 'alert' : 'status'}
                        >
                          {installmentPreview.error ? (
                            installmentPreview.error
                          ) : firstInstallment && lastInstallment ? (
                            <div className="space-y-1">
                              <p><strong>{installmentPreview.occurrences.length} parcelas</strong> · {formatPtBrLogicalDate(firstInstallment)} até {formatPtBrLogicalDate(lastInstallment)}.</p>
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
          )}

          <div className="sticky bottom-[calc(var(--app-mobile-bottom-nav-height)_+_env(safe-area-inset-bottom))] z-20 bg-[var(--card)] px-5 pb-4 sm:px-6 lg:static lg:pb-5">
            <FormActions
              isEditing={isEditing}
              loading={loading}
              onCancel={handleCancel}
              createLabel={
                creationMode === 'recurring'
                  ? 'Criar recorrência'
                  : creationMode === 'installment'
                    ? 'Criar parcelamento'
                    : 'Criar transação'
              }
              submitLabel="Salvar alterações"
            />
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="ds-panel sticky top-4 p-5" aria-labelledby="quick-compose-summary">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--orbit-primary)]">Resumo</p>
            <h3 id="quick-compose-summary" className="mt-1 text-lg font-semibold text-[var(--foreground)]">Antes de salvar</h3>

            <div className="mt-5 rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-4 text-center">
              <p className={`text-sm font-semibold ${operationTone}`}>{operationLabel}</p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{formatCentsToCurrency(formData.amount)}</p>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <SummaryRow label="Conta" value={selectedAccount ? `${selectedAccount.name} · ${selectedAccount.currency}` : 'Selecione uma conta'} />
              <SummaryRow label="Categoria" value={selectedCategory?.name ?? 'Selecione uma categoria'} />
              <SummaryRow label="Data" value={selectedDateLabel} />
              <SummaryRow label="Status" value={selectedStatusLabel} />
              <SummaryRow label="Descrição" value={formData.description || 'Sem descrição'} />
              {!isEditing && <SummaryRow label="Forma" value={creationMode === 'single' ? 'Única' : creationMode === 'recurring' ? 'Recorrente mensal' : 'Parcelada'} />}
            </dl>

            {creationMode === 'recurring' && firstRecurrenceDate && lastRecurrenceDate && !isEditing && (
              <p className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]">
                {recurrencePreview.dates.length} ocorrências, de {formatPtBrLogicalDate(firstRecurrenceDate)} até {formatPtBrLogicalDate(lastRecurrenceDate)}.
              </p>
            )}
            {creationMode === 'installment' && firstInstallment && lastInstallment && !isEditing && (
              <p className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]">
                {installmentPreview.occurrences.length} parcelas; total {formatCentsToCurrency(installmentTotal)}.
              </p>
            )}

            <p className="mt-4 text-xs leading-relaxed text-[var(--text-subtle)]">
              O resumo é apenas contextual. O backend continua derivando o tipo da categoria e revalidando todos os dados no write.
            </p>
          </div>
        </aside>
      </div>
    </FormContainer>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
